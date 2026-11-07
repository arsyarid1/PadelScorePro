import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Serve static files from public directory
  app.use(express.static(path.join(process.cwd(), "public")));

  // In-memory storage for cloud tournaments (Simulation)
  const cloudTournaments = new Map<string, any>();
  
  // Storage for User & Device Tracking (Persisted to disk)
  const ANALYTICS_FILE = path.join(process.cwd(), "analytics_sessions.json");
  const analyticsSessions = new Map<string, any>();

  // Load existing analytics from disk if available
  try {
    if (fs.existsSync(ANALYTICS_FILE)) {
      const rawData = fs.readFileSync(ANALYTICS_FILE, "utf-8");
      const parsed = JSON.parse(rawData);
      if (Array.isArray(parsed)) {
        parsed.forEach((item: any) => {
          if (item && item.visitorId) {
            analyticsSessions.set(item.visitorId, item);
          }
        });
        console.log(`[SERVER] Loaded ${analyticsSessions.size} analytics sessions from disk.`);
      }
    }
  } catch (err) {
    console.warn("[SERVER] Could not load analytics file:", err);
  }

  // Helper to save analytics to disk (debounced)
  let saveAnalyticsTimeout: any = null;
  const saveAnalyticsToDisk = () => {
    if (saveAnalyticsTimeout) clearTimeout(saveAnalyticsTimeout);
    saveAnalyticsTimeout = setTimeout(() => {
      try {
        const list = Array.from(analyticsSessions.values());
        fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(list, null, 2), "utf-8");
      } catch (e) {
        console.warn("[SERVER] Error persisting analytics:", e);
      }
    }, 2000);
  };

  // Predefined shortcodes
  const SHORTCODES = ["PADEL1", "PADEL2", "PADEL3", "PADEL4", "PADEL5", "PRO1", "PRO2", "PRO3", "PRO4", "PRO5", "MATCH1", "MATCH2", "MATCH3"];
  const shortcodeAssignments = new Map<string, string | null>(); // shortcode -> tournamentId
  SHORTCODES.forEach(code => shortcodeAssignments.set(code, null));

  // Helper to cleanup stale tournaments (Auto-finish after 24h)
  const AUTO_FINISH_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
  setInterval(() => {
    const now = Date.now();
    cloudTournaments.forEach((t, id) => {
      if (t.status === 'active' && t.lastActivity && (now - t.lastActivity > AUTO_FINISH_TIMEOUT)) {
        console.log(`[SERVER] Auto-finishing stale tournament: ${t.name} (ID: ${id})`);
        t.status = 'finished';
        if (t.shortcode) {
          shortcodeAssignments.set(t.shortcode, null);
        }
      }
    });
  }, 60 * 60 * 1000); // Check every hour

  // API Routes
  app.get("/api/shortcodes/available", (req, res) => {
    const available = Array.from(shortcodeAssignments.entries())
      .filter(([_, tId]) => tId === null)
      .map(([code]) => code);
    res.json(available);
  });

  app.get("/api/admin/tournaments", (req, res) => {
    const list = Array.from(cloudTournaments.values()).map(t => {
      const activeCourts = t.matches ? t.matches.filter((m: any) => m.status === 'live').length : 0;
      return {
        id: t.id,
        name: t.name,
        shortcode: t.shortcode,
        status: t.status,
        courts: t.courts,
        activeCourts: activeCourts,
        lastActivity: t.lastActivity
      };
    });
    res.json(list);
  });

  // Track User & Device Activity API
  app.post("/api/analytics/track", (req, res) => {
    try {
      const { visitorId, visitCount, device, location, currentView, action, role, userName } = req.body;
      if (!visitorId) {
        return res.status(400).json({ error: "Missing visitorId" });
      }

      // Extract client IP address
      const forwarded = req.headers['x-forwarded-for'];
      const rawIp = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress || '127.0.0.1';
      const cleanIp = rawIp.replace(/^::ffff:/, '');

      const now = Date.now();
      const existing = analyticsSessions.get(visitorId);

      const sessionData = {
        id: existing?.id || `sess_${Math.random().toString(36).substring(2, 9)}`,
        visitorId,
        userName: userName || existing?.userName || `Pengguna (${device?.type || 'Device'})`,
        role: role || existing?.role || 'Pengunjung',
        device: {
          type: device?.type || existing?.device?.type || 'Desktop',
          os: device?.os || existing?.device?.os || 'Unknown OS',
          browser: device?.browser || existing?.device?.browser || 'Unknown Browser',
          screen: device?.screen || existing?.device?.screen || '-',
          userAgent: device?.userAgent || existing?.device?.userAgent || req.headers['user-agent'] || '-'
        },
        location: {
          ip: cleanIp === '127.0.0.1' || cleanIp === '::1' ? (location?.ip || '127.0.0.1 (Local)') : cleanIp,
          city: location?.city || existing?.location?.city || 'Local Area',
          region: location?.region || existing?.location?.region || '',
          country: location?.country || existing?.location?.country || 'Indonesia',
          countryCode: location?.countryCode || existing?.location?.countryCode || 'ID',
          flag: location?.flag || existing?.location?.flag || '🇮🇩',
          isp: location?.isp || existing?.location?.isp || ''
        },
        currentView: currentView || existing?.currentView || 'dashboard',
        action: action || existing?.action || 'Aktivitas',
        firstSeen: existing?.firstSeen || now,
        lastActive: now,
        visitCount: Math.max(visitCount || 1, (existing?.visitCount || 0) + 1)
      };

      analyticsSessions.set(visitorId, sessionData);
      saveAnalyticsToDisk();

      res.json({ success: true, session: sessionData });
    } catch (err: any) {
      console.error("[SERVER] Analytics track error:", err);
      res.status(500).json({ error: err.message || "Failed to record analytics" });
    }
  });

  // Get Analytics Summary & Active Sessions for Super Admin
  app.get("/api/admin/analytics", (req, res) => {
    try {
      const now = Date.now();
      const sessions = Array.from(analyticsSessions.values());

      // Calculate online now (active in last 5 minutes)
      const onlineThreshold = 5 * 60 * 1000;
      const onlineNow = sessions.filter(s => (now - s.lastActive) < onlineThreshold).length;

      // Device breakdown
      const deviceBreakdown = {
        mobile: 0,
        tablet: 0,
        desktop: 0
      };

      // Top locations aggregation
      const locationMap = new Map<string, { count: number; flag: string }>();

      sessions.forEach(s => {
        const type = (s.device?.type || 'Desktop').toLowerCase();
        if (type === 'mobile') deviceBreakdown.mobile++;
        else if (type === 'tablet') deviceBreakdown.tablet++;
        else deviceBreakdown.desktop++;

        const locKey = s.location?.city ? `${s.location.city}, ${s.location.country}` : (s.location?.country || 'Local');
        const flag = s.location?.flag || '🌐';
        const current = locationMap.get(locKey) || { count: 0, flag };
        current.count++;
        locationMap.set(locKey, current);
      });

      const topLocations = Array.from(locationMap.entries())
        .map(([name, data]) => ({ name, count: data.count, flag: data.flag }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      // Sort sessions by lastActive descending
      const sortedSessions = [...sessions].sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0));

      res.json({
        success: true,
        summary: {
          totalVisitors: sessions.length,
          onlineNow,
          deviceBreakdown,
          topLocations
        },
        sessions: sortedSessions
      });
    } catch (err: any) {
      console.error("[SERVER] Error retrieving analytics:", err);
      res.status(500).json({ error: "Failed to retrieve analytics" });
    }
  });

  // Clear Analytics Logs
  app.post("/api/admin/analytics/clear", (req, res) => {
    try {
      analyticsSessions.clear();
      if (fs.existsSync(ANALYTICS_FILE)) {
        fs.writeFileSync(ANALYTICS_FILE, "[]", "utf-8");
      }
      res.json({ success: true, message: "Analytics logs cleared successfully." });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to clear logs" });
    }
  });

  app.post("/api/tournament/finish", (req, res) => {
    const { tournamentId, players } = req.body;
    const tournament = cloudTournaments.get(tournamentId);
    if (tournament) {
      tournament.status = 'finished';
      if (players) {
        tournament.players = players;
      }
      if (tournament.shortcode) {
        shortcodeAssignments.set(tournament.shortcode, null);
      }
      console.log(`[SERVER] Tournament finished: ${tournament.name} (ID: ${tournamentId})`);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Tournament not found" });
    }
  });

  app.post("/api/tournament/create", (req, res) => {
    const tournament = req.body;
    if (!tournament.id) {
      console.error("Attempted to create tournament without ID", req.body);
      return res.status(400).json({ error: "Missing tournament ID" });
    }
    
    // Update last activity
    tournament.lastActivity = Date.now();
    
    cloudTournaments.set(tournament.id, tournament);
    
    // Assign shortcode if provided
    if (tournament.shortcode) {
      shortcodeAssignments.set(tournament.shortcode, tournament.id);
    }
    
    console.log(`[SERVER] Cloud tournament synced: ${tournament.name} (ID: ${tournament.id}, Shortcode: ${tournament.shortcode})`);
    res.json({ success: true });
  });

  app.get("/api/tournament/:id", (req, res) => {
    const id = req.params.id;
    const tournament = cloudTournaments.get(id);
    if (tournament) {
      tournament.lastActivity = Date.now(); // Update activity on fetch
      console.log(`[SERVER] Tournament fetched: ${tournament.name} (ID: ${id})`);
      res.json(tournament);
    } else {
      console.warn(`[SERVER] Tournament NOT FOUND: ID ${id}. Available IDs: ${Array.from(cloudTournaments.keys()).join(', ')}`);
      res.status(404).json({ error: "Tournament not found" });
    }
  });

  app.get("/api/tournament/shortcode/:code", (req, res) => {
    const code = req.params.code.toUpperCase();
    const tournament = Array.from(cloudTournaments.values()).find(t => t.shortcode === code && t.status === 'active');
    if (tournament) {
      tournament.lastActivity = Date.now();
      console.log(`[SERVER] Tournament fetched by shortcode: ${code}`);
      res.json(tournament);
    } else {
      res.status(404).json({ error: "Tournament not found or already finished" });
    }
  });

  app.post("/api/tournament/match/finish", (req, res) => {
    const { tournamentId, matchId, finalScore, players } = req.body;
    const tournament = cloudTournaments.get(tournamentId);
    if (tournament) {
      tournament.lastActivity = Date.now();
      // Update players in the tournament object
      tournament.players = players;
      // Also update the match status in the tournament object
      tournament.matches = tournament.matches.map(m => 
        m.id === matchId ? { 
          ...m, 
          status: 'finished', 
          teamA: { ...m.teamA, score: finalScore.teamAScore, games: finalScore.teamAGames }, 
          teamB: { ...m.teamB, score: finalScore.teamBScore, games: finalScore.teamBGames } 
        } : m
      );
      console.log(`[SERVER] Match ${matchId} in tournament ${tournamentId} finished and saved.`);
    } else {
      console.warn(`[SERVER] Attempted to finish match in non-existent tournament: ${tournamentId}`);
    }
    res.json({ success: true, message: "Match results saved successfully." });
  });

  app.post("/api/reclub/import", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url || typeof url !== "string") {
        return res.status(400).json({ error: "URL Reclub tidak boleh kosong" });
      }

      // Extract URL if text was pasted containing link
      const urlMatch = url.match(/https?:\/\/[^\s]+/);
      const targetUrl = urlMatch ? urlMatch[0] : url.trim();

      if (!targetUrl.includes("reclub.co")) {
        return res.status(400).json({ error: "URL harus berasal dari domain reclub.co" });
      }

      console.log(`[SERVER] Fetching Reclub URL: ${targetUrl}`);
      const pageRes = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      });

      if (!pageRes.ok) {
        return res.status(pageRes.status).json({ error: `Gagal mengakses URL Reclub (Status ${pageRes.status})` });
      }

      const html = await pageRes.text();
      let eventName = "";
      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      if (titleMatch) {
        eventName = titleMatch[1].replace(/\s*-\s*Reclub\s*$/i, "").trim();
      }

      let payloadData: any[] | null = null;

      // Check for data-src in HTML (Nuxt SSR payload)
      const dataSrcMatch = html.match(/data-src=[\"']([^\"']+)[\"']/);
      if (dataSrcMatch) {
        const payloadUrl = new URL(dataSrcMatch[1], targetUrl).toString();
        try {
          const payloadRes = await fetch(payloadUrl, {
            headers: { "User-Agent": "Mozilla/5.0" }
          });
          if (payloadRes.ok) {
            payloadData = await payloadRes.json();
          }
        } catch (e) {
          console.warn("[SERVER] Error fetching _payload.json", e);
        }
      }

      // If not found from data-src, check for inline JSON script
      if (!payloadData) {
        const inlineMatch = html.match(/<script type="application\/json"[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
        if (inlineMatch) {
          try {
            payloadData = JSON.parse(inlineMatch[1]);
          } catch (e) {
            console.warn("[SERVER] Error parsing inline __NUXT_DATA__", e);
          }
        }
      }

      const players: Array<{ name: string; gender: "male" | "female"; avatarUrl?: string }> = [];
      const seenNames = new Set<string>();

      if (Array.isArray(payloadData)) {
        const resolveVal = (v: any) => typeof v === "number" && v >= 0 && v < payloadData!.length ? payloadData![v] : v;

        payloadData.forEach(item => {
          if (item && typeof item === "object") {
            // Check for user/player records
            if ("userId" in item || "username" in item || "participantId" in item || "competitionParticipantId" in item) {
              const rawName = resolveVal(item.name) || resolveVal(item.username) || resolveVal(item.displayName);
              const rawGender = resolveVal(item.gender);
              const rawImage = resolveVal(item.imageUrl) || resolveVal(item.avatarUrl);
              const rawId = resolveVal(item.userId) || rawName;

              if (rawName && typeof rawName === "string" && rawName.trim().length > 0) {
                const cleanName = rawName.trim();
                // Filter out generic tags or UI words
                const skipWords = ["admin", "member", "participant", "player", "null", "undefined"];
                if (!seenNames.has(cleanName.toLowerCase()) && cleanName.length >= 2) {
                  seenNames.add(cleanName.toLowerCase());
                  players.push({
                    name: cleanName,
                    gender: rawGender === "F" || rawGender === "female" ? "female" : "male",
                    avatarUrl: typeof rawImage === "string" && rawImage.startsWith("http") ? rawImage : undefined
                  });
                }
              }
            }
          }
        });
      }

      // Fallback: Check if there's competition or meet ID in URL
      if (players.length === 0) {
        const uuidMatch = targetUrl.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
        if (uuidMatch) {
          try {
            const apiRes = await fetch(`https://api.reclub.co/competitions/${uuidMatch[0]}`);
            if (apiRes.ok) {
              const compData = await apiRes.json();
              if (compData.name) eventName = compData.name;
              if (Array.isArray(compData.participants)) {
                for (const p of compData.participants) {
                  if (p.name && !seenNames.has(p.name.toLowerCase())) {
                    seenNames.add(p.name.toLowerCase());
                    players.push({
                      name: p.name,
                      gender: p.gender === "female" ? "female" : "male",
                      avatarUrl: p.avatarUrl
                    });
                  }
                }
              }
            }
          } catch (e) {
            console.warn("[SERVER] Error querying api.reclub.co", e);
          }
        }
      }

      // Fallback: Regex extraction for player names from HTML meta tags or structured content
      if (players.length === 0) {
        const descMatch = html.match(/<meta\s+(?:property|name)=["'](?:og:)?description["']\s+content=["']([^"']+)["']/i);
        if (descMatch) {
          const descText = descMatch[1];
          const listMatch = descText.match(/(?:attendees|participants|members|players|going|joined)[\s\:]+([^\.]+)/i);
          if (listMatch) {
            const names = listMatch[1].split(/[,&•;]+/).map(n => n.trim()).filter(n => n.length >= 2);
            names.forEach(name => {
              if (!seenNames.has(name.toLowerCase())) {
                seenNames.add(name.toLowerCase());
                players.push({
                  name,
                  gender: "male"
                });
              }
            });
          }
        }
      }

      if (players.length === 0) {
        return res.status(404).json({
          error: "Tidak dapat menemukan data pemain otomatis dari tautan Reclub ini. Pastikan link bersifat publik atau gunakan opsi input manual.",
          eventName
        });
      }

      console.log(`[SERVER] Successfully imported ${players.length} players from Reclub: ${eventName}`);
      return res.json({
        success: true,
        eventName: eventName || "Reclub Event",
        players
      });
    } catch (error: any) {
      console.error("[SERVER] Reclub import error:", error);
      return res.status(500).json({ error: error.message || "Gagal memproses URL Reclub" });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
