import { generateSyllabusPlan } from "@/lib/gemini";
import { searchEpisodes as lnSearchEpisodes, ListenNotesEpisode } from "@/lib/listennotes";
import { searchEpisode as spotifySearchEpisode } from "@/lib/spotify";
import type { GeminiSyllabusPlan, PlaylistMode, RankedEpisode, SyllabusResult } from "@/types/recommendation";

function normalize(value: number | undefined | null, min: number, max: number): number {
  if (value === undefined || value === null) return 0;
  if (max === min) return 0;
  const n = (value - min) / (max - min);
  return Math.max(0, Math.min(1, n));
}

function textMatchScore(needles: string[], hay: string): number {
  const text = hay.toLowerCase();
  const matches = needles.reduce((acc, n) => acc + (text.includes(n.toLowerCase()) ? 1 : 0), 0);
  return needles.length ? matches / needles.length : 0;
}

function msToISO(ms?: number): string | undefined {
  if (!ms) return undefined;
  try {
    return new Date(ms).toISOString();
  } catch {
    return undefined;
  }
}

export async function buildSyllabusWithEpisodes({
  topic,
  mode,
  desiredCount = 16,
  spotifyAccessToken,
}: {
  topic: string;
  mode: PlaylistMode;
  desiredCount?: number;
  spotifyAccessToken?: string;
}): Promise<SyllabusResult> {
  const plan: GeminiSyllabusPlan = await generateSyllabusPlan({ topic, mode });

  const perModuleTarget = Math.max(2, Math.min(4, Math.ceil(desiredCount / plan.modules.length)));
  const globalSeenEpisodeTitles = new Set<string>();
  const globalSeenSpotifyUris = new Set<string>();
  const allRanked: RankedEpisode[] = [];

  for (let moduleIndex = 0; moduleIndex < plan.modules.length; moduleIndex++) {
    const idea = plan.modules[moduleIndex];
    const episodeCandidates: ListenNotesEpisode[] = [];

    // Gather candidates by subtopic queries
    for (const sub of idea.subtopics) {
      const { results } = await lnSearchEpisodes({ query: `${plan.topic} ${sub}` });
      for (const ep of results) episodeCandidates.push(ep);
      if (episodeCandidates.length > perModuleTarget * 10) break; // cap queries per module
    }

    // Compute ranking inputs
    const listenScores = episodeCandidates.map((e) => e.podcast?.listen_score ?? 0).filter((n) => n !== null) as number[];
    const globalRanks = episodeCandidates.map((e) => e.podcast?.listen_score_global_rank ?? 0).filter((n) => n !== null) as number[];
    const recencies = episodeCandidates.map((e) => e.pub_date_ms ?? 0);
    const lsMin = Math.min(...listenScores, 0);
    const lsMax = Math.max(...listenScores, 100);
    const grMin = Math.min(...globalRanks, 1);
    const grMax = Math.max(...globalRanks, 1000000);
    const rMin = Math.min(...recencies, 0);
    const rMax = Math.max(...recencies, Date.now());

    const ranked: RankedEpisode[] = [];
    for (const ep of episodeCandidates) {
      const showTitle = ep.podcast?.title_original || "";
      const episodeTitle = ep.title_original || "";
      const text = `${episodeTitle}\n${ep.description_original ?? ""}`;
      const listenScore = ep.podcast?.listen_score ?? undefined;
      const showGlobalRank = ep.podcast?.listen_score_global_rank ?? undefined;
      const recency = ep.pub_date_ms ?? undefined;

      const score = computeCompositeScore({
        listenScore,
        listenScoreMin: lsMin,
        listenScoreMax: lsMax,
        showGlobalRank,
        showGlobalRankMin: grMin,
        showGlobalRankMax: grMax,
        recencyMs: recency,
        recencyMin: rMin,
        recencyMax: rMax,
        textMatchFraction: textMatchScore(idea.subtopics, text),
      });

      ranked.push({
        moduleIndex,
        showTitle,
        episodeTitle,
        listenScore,
        showGlobalRank,
        releaseDate: msToISO(recency),
        inclusionReason: `Supports objective: ${idea.objective}`,
        score,
      });
    }

    // Sort by score desc
    ranked.sort((a, b) => b.score - a.score);

    // Deduplicate by episode title
    const uniqueRanked: RankedEpisode[] = [];
    for (const r of ranked) {
      const key = `${r.showTitle}::${r.episodeTitle}`.toLowerCase();
      if (globalSeenEpisodeTitles.has(key)) continue;
      globalSeenEpisodeTitles.add(key);
      uniqueRanked.push(r);
      if (uniqueRanked.length >= perModuleTarget) break;
    }

    // Resolve Spotify URIs if possible, dedupe globally
    if (spotifyAccessToken) {
      for (const r of uniqueRanked) {
        const found = await spotifySearchEpisode(spotifyAccessToken, {
          episodeTitle: r.episodeTitle,
          showTitle: r.showTitle,
        });
        if (found && !globalSeenSpotifyUris.has(found.uri)) {
          r.spotifyUri = found.uri;
          globalSeenSpotifyUris.add(found.uri);
        }
      }
    }

    allRanked.push(...uniqueRanked);
  }

  // Enforce overall caps: ≤2 episodes per show
  const perShowCount = new Map<string, number>();
  const filtered: RankedEpisode[] = [];
  for (const r of allRanked.sort((a, b) => a.moduleIndex - b.moduleIndex || b.score - a.score)) {
    const c = perShowCount.get(r.showTitle) ?? 0;
    if (c >= 2) continue;
    perShowCount.set(r.showTitle, c + 1);
    filtered.push(r);
  }

  // Build modules → episodes mapping preserving module order
  const modules = plan.modules.map((idea, moduleIndex) => ({
    idea,
    episodes: filtered.filter((e) => e.moduleIndex === moduleIndex),
  }));

  // 101 vs 201 ordering adjustments: already roughly by module order + score.
  if (mode === "intro_101") {
    // For 101, sort within module by ascending complexity: approximate by recency older first then score.
    for (const m of modules) {
      m.episodes.sort((a, b) => (a.releaseDate ?? "").localeCompare(b.releaseDate ?? ""));
    }
  } else {
    // For 201, keep score-desc within modules (done), possibly prefer more recent first
    for (const m of modules) {
      m.episodes.sort((a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""));
    }
  }

  return {
    topic: plan.topic,
    mode: plan.mode,
    modules,
    requestedEpisodeCount: desiredCount,
  } satisfies SyllabusResult;
}

export function computeCompositeScore({
  listenScore,
  listenScoreMin,
  listenScoreMax,
  showGlobalRank,
  showGlobalRankMin,
  showGlobalRankMax,
  recencyMs,
  recencyMin,
  recencyMax,
  textMatchFraction,
}: {
  listenScore?: number;
  listenScoreMin: number;
  listenScoreMax: number;
  showGlobalRank?: number;
  showGlobalRankMin: number;
  showGlobalRankMax: number;
  recencyMs?: number;
  recencyMin: number;
  recencyMax: number;
  textMatchFraction: number;
}): number {
  const ls = normalize(listenScore ?? 0, listenScoreMin, listenScoreMax);
  const gr = 1 - normalize((showGlobalRank ?? showGlobalRankMax), showGlobalRankMin, showGlobalRankMax);
  const rc = normalize(recencyMs ?? 0, recencyMin, recencyMax);
  const tm = Math.max(0, Math.min(1, textMatchFraction));
  return 0.45 * ls + 0.25 * gr + 0.20 * rc + 0.10 * tm;
}

