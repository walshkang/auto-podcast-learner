import { NextRequest, NextResponse } from "next/server";
import { buildSyllabusWithEpisodes } from "@/lib/syllabus";
import type { PlaylistMode } from "@/types/recommendation";
import { auth } from "@/app/api/auth/[...nextauth]/route";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "global";
    const rl = rateLimit({ key: `recommend:${ip}`, limit: 20, windowMs: 60_000 });
    if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const { topic, mode, desiredCount } = (await req.json()) as { topic: string; mode: PlaylistMode; desiredCount?: number };
    if (!topic || !mode) return NextResponse.json({ error: "Missing topic or mode" }, { status: 400 });

    const session = await auth();
    const accessToken = (session as any)?.accessToken as string | undefined;

    const syllabus = await buildSyllabusWithEpisodes({ topic, mode, desiredCount, spotifyAccessToken: accessToken });
    return NextResponse.json(syllabus);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

