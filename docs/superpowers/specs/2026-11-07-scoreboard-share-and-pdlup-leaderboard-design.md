# Design Specification: Scoreboard Sharing & PDLUP-Style Leaderboard

**Date:** 2026-11-07  
**Status:** Approved  
**Author:** Antigravity & User  

---

## 1. Overview & Objectives

This specification defines the implementation of a comprehensive tournament sharing and spectator experience for **PadelScore Pro**, matching and surpassing **PDLUP** capabilities:

1. **PDLUP-Style Detailed Leaderboard**:
   - Modernized standings table with standard international padel metrics:
     - **G**: Games / Matches Played
     - **W-L-T**: Wins - Losses - Ties (e.g. `4 - 1 - 0`)
     - **Diff**: Point / Game Difference (`+18` / `-6`)
     - **+M**: Compensation points for benched players (rest rounds)
     - **Points**: Total accumulated points (Match Points + `+M`)
   - Support for single and split tables (Male & Female rankings for Mexicano Mix).
   - Top 3 visual podium display with dynamic glow badges.

2. **Public Spectator Portal (Like PDLUP `/t/:id`)**:
   - Upgraded [`SpectatorView.tsx`](file:///d:/ARSYA/PADEL/PadelScore%20Pro/15%20oct%202026/components/SpectatorView.tsx) accessible by anyone without login.
   - Dual Tab Navigation:
     - **Tab 1: Matches & Rounds**: View all rounds, match schedules, live matches with animated pulse badge (`🔴 LIVE`), and completed match scores per court.
     - **Tab 2: Leaderboard**: Realtime updated standings table with PDLUP columns.
   - Tournament Share button to copy or share the spectator link directly to WhatsApp.

3. **High-Res Match Scorecard Image Generator (JPEG/PNG)**:
   - When a match finishes (*Finish Match* on `LiveScoreboard` or `MultiCourtScoreboard`), users can click **"Share Result"**.
   - Generates an aesthetic, cyberpunk/neon dark-mode match result poster using HTML5 Canvas:
     - Tournament header, Court number, and Round
     - Team A vs Team B player avatars, names, and club tags
     - Big score digits (Sets / Games / Rally points)
     - Winner crown / banner highlight
     - PadelScore Pro branding & QR code linking to the live spectator page
   - Native Web Share API integration (`navigator.share({ files, text, url })`) for 1-click sharing to WhatsApp, Instagram Story, Telegram, plus fallback Download PNG button.

---

## 2. Data Architecture & Types

### 2.1 Extended `Player` & `Match` Statistics (`types.ts`)
```ts
export interface PlayerStats {
  gamesPlayed: number;       // G
  wins: number;              // W
  losses: number;            // L
  ties: number;              // T
  pointsScored: number;
  pointsConceded: number;
  diff: number;              // Diff: pointsScored - pointsConceded
  compensationPoints: number;// +M: extra points for rest rounds
  totalPoints: number;       // Points: match points + compensationPoints
}
```

### 2.2 Calculation Logic (`utils/gameLogic.ts`)
- **Diff**: Sum of player's team scores minus opponent team scores across all finished matches.
- **W-L-T**:
  - Win if team score > opponent score
  - Tie if team score == opponent score
  - Loss if team score < opponent score
- **+M (Compensation Points)**:
  - If a player was benched while other players played more matches:
  - Calculate `avgPointsPerMatch = totalPointsScored / matchesPlayed`.
  - `missedMatches = maxMatchesInTournament - player.matchesPlayed`.
  - `compensationPoints = Math.round(missedMatches * avgPointsPerMatch)`.
- **Total Points**: `points + compensationPoints`.

---

## 3. Component Architecture

```
App.tsx
├── /t/:id or /live?code=... ─── SpectatorView.tsx
│                                 ├── Tab 1: Rounds & Matches View (All Courts & Scores)
│                                 └── Tab 2: Leaderboard View (G, W-L-T, Diff, +M, Points)
│
├── Leaderboard.tsx ───────────── Detailed Standings Table + Podium
│
├── LiveScoreboard.tsx ────────── Finish Match Modal ─── MatchShareModal.tsx
│                                                         ├── Canvas Card Renderer
│                                                         ├── Web Share API (WhatsApp/Medsos)
│                                                         └── Download Image
│
└── MultiCourtScoreboard.tsx ──── Match Result Share ─── MatchShareModal.tsx
```

---

## 4. Testing & Verification Plan

1. Verify `npm run build` compiles with 0 TypeScript/syntax errors.
2. Verify calculation of G, W-L-T, Diff, and +M with various match results (including draws, uneven rounds).
3. Test spectator view tabs: switching between Matches and Leaderboard works smoothly.
4. Test MatchShareModal: Canvas rendering produces crisp image, Web Share API triggers on supported devices, and Download PNG works on PC.
5. Commit and push to git repo.
