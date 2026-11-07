# Scoreboard Sharing & PDLUP-Style Leaderboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a PDLUP-style leaderboard with standard padel tournament metrics (G, W-L-T, Diff, +M, Points), a public tournament spectator portal (`/t/:id` and shortcode) with dual tabs (Matches & Leaderboard), and an aesthetic high-resolution Match Result Scorecard image generator with Web Share API and download capabilities.

**Architecture:** Extend player stats calculation logic in `utils/gameLogic.ts` to compute Games Played (G), Wins-Losses-Ties (W-L-T), Score Difference (Diff), and Benched Compensation Points (+M). Update `components/Leaderboard.tsx` with responsive tables. Create `components/MatchShareModal.tsx` with an HTML5 Canvas rendering engine and Web Share API integration. Integrate the share modal into `LiveScoreboard.tsx` and `MultiCourtScoreboard.tsx`. Upgrade `components/SpectatorView.tsx` with dual tabs for matches and leaderboard.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide icons, Canvas API, Web Share API, Vite.

**Spec:** `docs/superpowers/specs/2026-11-07-scoreboard-share-and-pdlup-leaderboard-design.md`

## Global Constraints

- Preserve all existing tournament formats (Americano, Mexicano, Mix, Fix, Club, Pro Knockout).
- Maintain responsiveness across mobile and desktop.
- Canvas image generation must produce sharp, high-DPI (2x scale) images suitable for WhatsApp and Instagram Story.
- Pure client-side canvas rendering without heavy unneeded dependencies.
- Build must compile cleanly with `npm run build` after every task.

---

### Task 1: Player & Match Stats Calculation Engine (G, W-L-T, Diff, +M, Points)

**Files:**
- Modify: `types.ts`
- Modify: `utils/gameLogic.ts`
- Test: `test-stats-engine.js` (scratch verification script)

**Interfaces:**
- Produces: `calculatePlayerStats(player: Player, allMatches: Match[], maxTournamentMatches: number): PlayerTournamentStats`
```ts
export interface PlayerTournamentStats {
  gamesPlayed: number;        // G
  wins: number;               // W
  losses: number;             // L
  ties: number;               // T
  pointsScored: number;
  pointsConceded: number;
  diff: number;               // Diff
  compensationPoints: number; // +M
  totalPoints: number;        // Points (points + compensationPoints)
}
```

- [ ] **Step 1: Define `PlayerTournamentStats` in `types.ts`**
- [ ] **Step 2: Implement `calculatePlayerStats` in `utils/gameLogic.ts`**
  - Compute total finished matches for this player.
  - Count wins, losses, ties based on finished match scores.
  - Sum `pointsScored` and `pointsConceded` and compute `diff = pointsScored - pointsConceded`.
  - Calculate `compensationPoints` (+M): if player was benched and `gamesPlayed < maxMatches`, award average points per match for missed rounds.
  - Return combined total points.
- [ ] **Step 3: Test calculation with verification script**
- [ ] **Step 4: Verify with `npm run build` and commit**

---

### Task 2: Redesign `components/Leaderboard.tsx` with PDLUP Columns

**Files:**
- Modify: `components/Leaderboard.tsx`

**Interfaces:**
- Consumes: `calculatePlayerStats` from `utils/gameLogic.ts`
- Renders:
  - Table columns: `Rank`, `Player`, `G`, `W-L-T`, `Diff`, `+M`, `Points`, `Action`
  - Mobile-responsive layout (horizontal scrolling or compact responsive chips)
  - Split tables for Male and Female when in Mexicano Mix mode
  - Visual Top 3 podium

- [ ] **Step 1: Update table headers and data rows in `components/Leaderboard.tsx`**
  - Add G, W-L-T, Diff (+/- green/red styling), +M, and Total Points columns.
  - Update `renderPlayerRows` to use `calculatePlayerStats`.
- [ ] **Step 2: Add quick explanation tooltip / info pill for +M (Poin Kompensasi)**
- [ ] **Step 3: Verify with `npm run build` and commit**

---

### Task 3: Match Result Card Generator Component (`components/MatchShareModal.tsx`)

**Files:**
- Create: `components/MatchShareModal.tsx`

**Interfaces:**
- Props:
```ts
interface MatchShareModalProps {
  match: Match;
  tournament: Tournament;
  onClose: () => void;
}
```
- Features:
  - Generates 1080x1080 (Square) or 1080x1920 (Story) high-res graphic on canvas.
  - Card elements: Tournament name, Court, Round, Player avatars & names, Winner badge, Sets/Games breakdown, PadelScore Pro branding, QR code.
  - Buttons: "Share ke WhatsApp / Medsos" (`navigator.share`), "Download Gambar" (.png), "Salin Link Web".

- [ ] **Step 1: Create `MatchShareModal.tsx` with Canvas rendering function**
- [ ] **Step 2: Implement Web Share API and Download fallback**
- [ ] **Step 3: Verify with `npm run build` and commit**

---

### Task 4: Integrate Share Modal with Scoreboards (`LiveScoreboard.tsx` & `MultiCourtScoreboard.tsx`)

**Files:**
- Modify: `components/LiveScoreboard.tsx`
- Modify: `components/MultiCourtScoreboard.tsx`

**Interfaces:**
- Consumes: `MatchShareModal`
- Adds:
  - Button "Bagikan Hasil (Share)" on the match finished pop-up / scoreboard controls.
  - State `shareMatch: Match | null` to open `MatchShareModal`.

- [ ] **Step 1: Add "Share Result" button to `LiveScoreboard.tsx` finish dialog**
- [ ] **Step 2: Add "Share Result" button to `MultiCourtScoreboard.tsx` completed match cards**
- [ ] **Step 3: Verify with `npm run build` and commit**

---

### Task 5: Upgrade Public Spectator Hub (`components/SpectatorView.tsx` & `App.tsx`)

**Files:**
- Modify: `components/SpectatorView.tsx`
- Modify: `App.tsx`

**Interfaces:**
- Enhances `SpectatorView`:
  - Tabs: `Tab 1: Rounds & Matches` (All rounds, court schedules, live match indicator `🔴 LIVE`, final scores) and `Tab 2: Leaderboard` (PDLUP columns).
  - Share Tournament button in header (copies public spectator link / shares to WhatsApp).
- Enhances `App.tsx`:
  - Route support for `/t/:id` and `/live?code=CODE`.

- [ ] **Step 1: Upgrade `SpectatorView.tsx` with dual tabs (Matches & Leaderboard)**
- [ ] **Step 2: Ensure URL routing handles `/t/:id` and shortcode properly**
- [ ] **Step 3: Verify with `npm run build` and commit**

---

### Task 6: Comprehensive Verification & Git Push

- [ ] **Step 1: Run `npm run build` and ensure 0 errors**
- [ ] **Step 2: Verify all flows (Leaderboard, Spectator View, Match Share Modal)**
- [ ] **Step 3: Push all commits to `origin main`**
