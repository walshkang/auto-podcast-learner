# Roadmap

A phased plan to ship an MVP without ListenNotes first, then layer in popularity ranking and polish.

## Phase 0 – Working MVP (no ListenNotes)
Goal: End-to-end experience using only Gemini + Spotify. Private playlist creation works.

What it does
- Topic input + 101/201 mode
- Gemini generates a course-like syllabus (modules with objectives)
- For each module, Gemini proposes concrete episode candidates (title + show + rationale)
- Resolve episodes to Spotify URIs (best-effort) via the Spotify Search API
- Order modules and episodes as a syllabus and export to a private Spotify playlist

How to run (no ListenNotes)
- Create `.env.local` with everything except `LISTENNOTES_API_KEY`
- Start the app: `npm run dev` and connect Spotify from the UI

Implementation checklist (no code changes applied yet; suggested edits)
1) Add a feature flag (choose either):
   - Option A: env flag
     - Add `FEATURE_NO_LISTENNOTES=1` to `.env.local`
   - Option B: infer from missing key
     - If `!process.env.LISTENNOTES_API_KEY`, use Gemini-only path
2) Add Gemini-only episode discovery per module:
   - Create a helper (e.g., `lib/gemini.ts`): `generateModuleEpisodeCandidates(topic, moduleIdea)` that asks Gemini for 2–4 specific episodes per module.
   - Suggested minimal schema returned by Gemini:
```ts
// Proposed (new) type for MVP-only fallback
export interface GeminiEpisodeCandidate {
  showTitle: string;
  episodeTitle: string;
  inclusionReason: string; // why this episode fits the module objective
}
```
3) Use Spotify search to resolve URIs:
   - Reuse `lib/spotify.searchEpisode({ episodeTitle, showTitle })`
   - Keep only resolved episodes (skip those with no URI)
4) Ordering rules without ListenNotes scores:
   - 101: prefer older → newer within module, to build foundational knowledge gradually
   - 201: prefer newer → older within module, unless Gemini indicates “seminal/classic”
   - Optional: ask Gemini to include a simple “difficulty” score (1–5) and sort accordingly
5) Playlist creation remains the same:
   - Name: `{Topic} 101/201 Syllabus`
   - Description: include brief course blurb and generation date

Suggested Gemini prompts for MVP
- Syllabus (already implemented): keep current prompt
- Per-module episode candidates (add):
```text
You are a podcast curriculum designer. For the course module below, list 2–4 specific podcast episodes that best teach the module objective.
Return STRICT JSON array of objects with keys: showTitle, episodeTitle, inclusionReason.
Constraints: Prefer reputable shows, episodes with strong clarity for the target level (101 or 201), and practical insights.
Module:
- Topic: {TOPIC}
- Mode: {intro_101|deep_dive_201}
- Module title: {moduleTitle}
- Objective: {objective}
- Subtopics: {comma-separated}
```

Known limitations (MVP)
- Popularity-based ranking is approximate (Gemini’s reasoning + simple ordering rules)
- Some episodes may not exist on Spotify or be hard to resolve via search
- Speed/latency: multiple Gemini calls (one per module) can slow generation

Milestone definition (MVP)
- Can generate a useful syllabus for a few topics
- Can export a Spotify playlist with ≥80% of episodes resolved to URIs
- Basic error messages are clear; no crashes on empty or niche topics

## Phase 1 – ListenNotes integration (quality ranking)
Goal: Introduce objective popularity signals and tighter filtering.

What to add
- Use ListenNotes search per module subtopics
- Compute composite score:
  - 0.45 · normalize(ListenScore)
  - 0.25 · normalize(ShowGlobalRankInverse)
  - 0.20 · normalize(Recency)
  - 0.10 · textMatch(subtopics, title+description)
- Keep caps: ≤2 episodes per show overall; 2–4 per module
- Fall back to Gemini-only path if ListenNotes returns sparse results

Steps
- Add `LISTENNOTES_API_KEY` to `.env.local`
- Switch feature flag off (or let code auto-detect presence of key)
- Keep current UX; users shouldn’t notice API source changes beyond better results

Quality gates
- Increased on-topic precision for niche topics
- Better episode diversity across shows
- Stable URI resolution rate

## Phase 2 – Re-ranking and polish
- Re-rank shortlists with Gemini using metadata snippets (title/description) for topicality and clarity
- Export syllabus as Markdown/PDF (for sharing)
- Persist past syllabi and playlists (SQLite/Prisma)
- Loading states and progress indicator per module
- Add “retry” for modules with zero episodes

## Phase 3 – Production hardening
- Replace in-memory rate limiter with a durable store (e.g., Upstash Redis)
- Caching of ListenNotes/Spotify lookups (TTL)
- Observability: request logging, error capture, basic metrics
- UI refinements and empty-state improvements

## Current commands
- Dev: `npm run dev`
- Build: `npm run build` → `npm start`
- Tests (ranking heuristic): `npm run test`

## Next actions for you
- Fill `.env.local` (skip `LISTENNOTES_API_KEY` for now)
- If you want the MVP today, implement the Gemini-only fallback path described above (small edits in `lib/syllabus.ts` and `lib/gemini.ts`) or ask me to add it
- Try a few topics (101 and 201) and export the playlist
