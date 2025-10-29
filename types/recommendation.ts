export type PlaylistMode = 'intro_101' | 'deep_dive_201';

export interface SyllabusModuleIdea {
  moduleTitle: string;
  objective: string;
  subtopics: string[];
  whyBeforeNext: string;
  suggestedShows: string[];
}

export interface GeminiSyllabusPlan {
  topic: string;
  mode: PlaylistMode;
  modules: SyllabusModuleIdea[];
}

export interface RankedEpisode {
  moduleIndex: number;
  showTitle: string;
  episodeTitle: string;
  listenScore?: number; // ListenNotes
  showGlobalRank?: number; // lower is better
  releaseDate?: string;
  spotifyUri?: string;
  inclusionReason: string;
  score: number;
}

export interface SyllabusResult {
  topic: string;
  mode: PlaylistMode;
  modules: Array<{
    idea: SyllabusModuleIdea;
    episodes: RankedEpisode[];
  }>;
  requestedEpisodeCount: number;
}

