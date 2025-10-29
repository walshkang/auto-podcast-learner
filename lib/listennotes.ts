const LISTEN_NOTES_BASE = "https://listen-api.listennotes.com/api/v2";

function getListenNotesKey(): string {
  const key = process.env.LISTENNOTES_API_KEY;
  if (!key) throw new Error("Missing LISTENNOTES_API_KEY");
  return key;
}

async function lnFetch(path: string, params: Record<string, string | number | boolean> = {}) {
  const url = new URL(LISTEN_NOTES_BASE + path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const res = await fetch(url.toString(), {
    headers: {
      "X-ListenAPI-Key": getListenNotesKey(),
    },
    // 10s timeout via AbortController
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ListenNotes ${path} failed: ${res.status} ${res.statusText} ${body}`);
  }
  return res.json();
}

export interface ListenNotesEpisode {
  id: string;
  title_original: string;
  description_original?: string;
  audio?: string;
  audio_length_sec?: number;
  pub_date_ms?: number;
  podcast?: {
    id?: string;
    title_original?: string;
    listen_score?: number | null;
    listen_score_global_rank?: number | null;
  };
}

export async function searchEpisodes({
  query,
  offset = 0,
  limit = 10,
}: {
  query: string;
  offset?: number;
  limit?: number;
}): Promise<{ results: ListenNotesEpisode[] }>
{
  const data = await lnFetch("/search", {
    q: query,
    type: "episode",
    offset,
    len_min: 5,
    len_max: 240,
    sort_by_date: 0,
    only_in: "title,description",
  });
  return { results: (data?.results ?? []) as ListenNotesEpisode[] };
}

export async function searchShows({ query, limit = 5 }: { query: string; limit?: number; }) {
  const data = await lnFetch("/search", {
    q: query,
    type: "podcast",
    offset: 0,
    sort_by_date: 0,
  });
  return { results: (data?.results ?? []).slice(0, limit) as any[] };
}

