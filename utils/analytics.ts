import { UserDevice, UserLocation, UserActivitySession } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const VISITOR_KEY = 'padelscore_visitor_id';
const VISITS_KEY = 'padelscore_visit_count';
const LOCATION_CACHE_KEY = 'padelscore_location_cache';

// Helper to convert country code (e.g. ID, US) to emoji flag
export function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// Generate unique persistent Visitor ID
export function getOrCreateVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
      const time = Date.now().toString(36).toUpperCase();
      id = `USR-${rand}-${time.slice(-4)}`;
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return 'USR-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  }
}

// Get and increment visit count
export function incrementVisitCount(): number {
  try {
    const raw = localStorage.getItem(VISITS_KEY);
    const count = raw ? parseInt(raw, 10) + 1 : 1;
    localStorage.setItem(VISITS_KEY, String(count));
    return count;
  } catch {
    return 1;
  }
}

// Parse device information from navigator
export function getDeviceInfo(): UserDevice {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  let os = 'Unknown OS';
  let browser = 'Unknown Browser';
  let type: 'Mobile' | 'Tablet' | 'Desktop' = 'Desktop';

  // Detect OS
  if (/iPad|iPhone|iPod/.test(ua)) {
    os = 'iOS';
    const match = ua.match(/OS (\d+[_\d]*)/);
    if (match) os += ` ${match[1].replace(/_/g, '.')}`;
  } else if (/Android/.test(ua)) {
    os = 'Android';
    const match = ua.match(/Android (\d+[\.\d]*)/);
    if (match) os += ` ${match[1]}`;
  } else if (/Windows NT 10.0/.test(ua)) {
    os = 'Windows 10/11';
  } else if (/Windows/.test(ua)) {
    os = 'Windows';
  } else if (/Mac OS X/.test(ua)) {
    os = 'macOS';
    const match = ua.match(/Mac OS X (\d+[_\d]*)/);
    if (match) os += ` ${match[1].replace(/_/g, '.')}`;
  } else if (/Linux/.test(ua)) {
    os = 'Linux';
  }

  // Detect Browser
  if (/Edg\//.test(ua)) {
    browser = 'Edge';
  } else if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) {
    browser = 'Chrome';
  } else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) {
    browser = 'Safari';
  } else if (/Firefox\//.test(ua)) {
    browser = 'Firefox';
  } else if (/SamsungBrowser\//.test(ua)) {
    browser = 'Samsung Internet';
  }

  // Detect Device Type
  const isTablet = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk)/i.test(ua);
  const isMobile = /mobile|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop/i.test(ua);

  if (isTablet) {
    type = 'Tablet';
  } else if (isMobile || (typeof window !== 'undefined' && window.innerWidth < 768)) {
    type = 'Mobile';
  } else {
    type = 'Desktop';
  }

  const width = typeof window !== 'undefined' ? window.screen.width : 0;
  const height = typeof window !== 'undefined' ? window.screen.height : 0;
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const screen = `${width}x${height} (${Math.round(dpr * 10) / 10}x)`;

  return {
    type,
    os,
    browser,
    screen,
    userAgent: ua
  };
}

// Fetch approximate location using free, reliable public IP APIs with caching
export async function getLocationInfo(): Promise<UserLocation> {
  const defaultLoc: UserLocation = {
    ip: '127.0.0.1',
    city: 'Local',
    region: 'Local Network',
    country: 'Indonesia',
    countryCode: 'ID',
    flag: '🇮🇩'
  };

  try {
    const cached = sessionStorage.getItem(LOCATION_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {}

  try {
    // Try ipwho.is (fast, free, supports HTTPS and CORS)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch('https://ipwho.is/', { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data && data.success !== false) {
        const countryCode = data.country_code || 'ID';
        const loc: UserLocation = {
          ip: data.ip || 'Unknown',
          city: data.city || 'Unknown City',
          region: data.region || '',
          country: data.country || 'Indonesia',
          countryCode: countryCode,
          flag: data.flag?.emoji || getCountryFlag(countryCode),
          isp: data.connection?.isp || data.connection?.org || '',
          latitude: data.latitude,
          longitude: data.longitude
        };
        try {
          sessionStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(loc));
        } catch {}
        return loc;
      }
    }
  } catch {
    // Fallback attempt: api.country.is
    try {
      const res = await fetch('https://api.country.is/');
      if (res.ok) {
        const data = await res.json();
        const code = data.country || 'ID';
        const loc: UserLocation = {
          ip: data.ip || 'Unknown',
          city: code === 'ID' ? 'Indonesia' : code,
          region: '',
          country: code === 'ID' ? 'Indonesia' : code,
          countryCode: code,
          flag: getCountryFlag(code)
        };
        try {
          sessionStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(loc));
        } catch {}
        return loc;
      }
    } catch {}
  }

  return defaultLoc;
}

let lastReportTime = 0;
let lastAction = '';

// Main tracker function to report user activity
export async function trackActivity(
  action: string,
  currentView: string = 'dashboard',
  metadata?: { role?: string; userName?: string }
): Promise<void> {
  const now = Date.now();
  // Prevent duplicate burst reports of the exact same action within 5 seconds
  if (action === lastAction && now - lastReportTime < 5000) {
    return;
  }

  lastAction = action;
  lastReportTime = now;

  try {
    const visitorId = getOrCreateVisitorId();
    const visitCount = incrementVisitCount();
    const device = getDeviceInfo();
    const location = await getLocationInfo();

    const payload = {
      visitorId,
      visitCount,
      device,
      location,
      currentView,
      action,
      role: metadata?.role || 'User',
      userName: metadata?.userName || `Pengguna (${device.type})`,
      timestamp: now
    };

    // 1. Direct Cloud Sync via Supabase if configured
    if (isSupabaseConfigured) {
      try {
        supabase.from('user_activity_logs').upsert({
          visitor_id: visitorId,
          user_name: payload.userName,
          role: payload.role,
          device: payload.device,
          location: payload.location,
          current_view: payload.currentView,
          action: payload.action,
          visit_count: payload.visitCount,
          last_active: now,
          updated_at: new Date(now).toISOString()
        }, { onConflict: 'visitor_id' }).then(({ error }: any) => {
          if (error) console.debug('Supabase telemetry notice:', error.message);
        });
      } catch (e) {
        console.debug('Supabase telemetry exception:', e);
      }
    }

    // 2. Also send to API endpoint (for Vercel serverless / local server)
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {
      // Ignore network errors if server is unreachable
    });
  } catch (err) {
    console.debug('Telemetry notice:', err);
  }
}

// Start recurring heartbeat (every 60s) to keep status "Online"
let heartbeatInterval: any = null;
export function startTelemetryHeartbeat(getView: () => string, getRole?: () => string) {
  if (heartbeatInterval) return;
  // Initial ping
  trackActivity('Buka Aplikasi', getView(), { role: getRole ? getRole() : 'User' });

  heartbeatInterval = setInterval(() => {
    trackActivity('Aktif di Halaman', getView(), { role: getRole ? getRole() : 'User' });
  }, 60000);
}
