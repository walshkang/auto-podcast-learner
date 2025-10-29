import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/api/auth/[...nextauth]/route";
import { addItemsToPlaylist, createPlaylist } from "@/lib/spotify";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "global";
    const rl = rateLimit({ key: `playlist:${ip}`, limit: 10, windowMs: 60_000 });
    if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const session = await auth();
    const accessToken = (session as any)?.accessToken as string | undefined;
    if (!accessToken) return NextResponse.json({ error: "Not authenticated with Spotify" }, { status: 401 });

    const { name, description, uris } = (await req.json()) as { name?: string; description?: string; uris: string[] };
    if (!uris || !Array.isArray(uris) || uris.length === 0) return NextResponse.json({ error: "No URIs provided" }, { status: 400 });

    const playlistName = name ?? "Podcast Learner Playlist";
    const resp = await createPlaylist(accessToken, { name: playlistName, description, isPublic: false });
    const playlistId = resp.id as string;
    await addItemsToPlaylist(accessToken, playlistId, uris);
    return NextResponse.json({ id: playlistId, url: resp.external_urls?.spotify });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

