export interface SpotifyUser {
  id: string;
  display_name?: string;
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function getCurrentUser(accessToken: string): Promise<SpotifyUser> {
  const res = await fetch("https://api.spotify.com/v1/me", {
    headers: authHeader(accessToken),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Spotify me failed: ${res.status}`);
  return res.json();
}

export async function createPlaylist(accessToken: string, {
  name,
  description,
  isPublic = false,
}: {
  name: string;
  description?: string;
  isPublic?: boolean;
}) {
  const me = await getCurrentUser(accessToken);
  const res = await fetch(`https://api.spotify.com/v1/users/${encodeURIComponent(me.id)}/playlists`, {
    method: "POST",
    headers: {
      ...authHeader(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, description, public: isPublic }),
  });
  if (!res.ok) throw new Error(`Create playlist failed: ${res.status}`);
  return res.json();
}

export async function addItemsToPlaylist(accessToken: string, playlistId: string, uris: string[]) {
  // Spotify allows up to 100 per request
  for (let i = 0; i < uris.length; i += 100) {
    const chunk = uris.slice(i, i + 100);
    const res = await fetch(`https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}/tracks`, {
      method: "POST",
      headers: {
        ...authHeader(accessToken),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uris: chunk }),
    });
    if (!res.ok) throw new Error(`Add items failed: ${res.status}`);
  }
}

export interface EpisodeSearchResult {
  uri: string;
  name: string;
  showName?: string;
}

export async function searchEpisode(accessToken: string, query: { episodeTitle: string; showTitle?: string; }): Promise<EpisodeSearchResult | null> {
  const candidates: string[] = [];
  const { episodeTitle, showTitle } = query;
  candidates.push(`episode:"${episodeTitle}"` + (showTitle ? ` show:"${showTitle}"` : ""));
  candidates.push(`${episodeTitle}` + (showTitle ? ` ${showTitle}` : ""));

  for (const q of candidates) {
    const url = new URL("https://api.spotify.com/v1/search");
    url.searchParams.set("q", q);
    url.searchParams.set("type", "episode");
    url.searchParams.set("limit", "5");
    const res = await fetch(url.toString(), { headers: authHeader(accessToken) });
    if (!res.ok) continue;
    const data = await res.json();
    const items = data?.episodes?.items ?? [];
    if (items.length > 0) {
      const item = items[0];
      return { uri: item.uri, name: item.name, showName: item?.show?.name };
    }
  }
  return null;
}

