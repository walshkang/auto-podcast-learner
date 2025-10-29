import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import type { GeminiSyllabusPlan, PlaylistMode } from "@/types/recommendation";

const syllabusSchema = z.object({
  topic: z.string().min(1),
  mode: z.union([z.literal("intro_101"), z.literal("deep_dive_201")]),
  modules: z
    .array(
      z.object({
        moduleTitle: z.string().min(1),
        objective: z.string().min(1),
        subtopics: z.array(z.string().min(1)).min(1),
        whyBeforeNext: z.string().min(1),
        suggestedShows: z.array(z.string().min(1)).min(1).max(12),
      })
    )
    .min(3)
    .max(6),
});

export async function generateSyllabusPlan({
  topic,
  mode,
}: {
  topic: string;
  mode: PlaylistMode;
}): Promise<GeminiSyllabusPlan> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GOOGLE_API_KEY");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const system =
    `You are an expert podcast curriculum designer. You create a course-like syllabus (modules with objectives) for a given topic using ONLY high-quality podcasts.\n` +
    `Produce a JSON object with keys {topic, mode, modules}. Each module has {moduleTitle, objective, subtopics, whyBeforeNext, suggestedShows}.\n` +
    `- Mode intro_101: beginner-friendly, minimal jargon, scaffolding, broad overviews first.\n` +
    `- Mode deep_dive_201: advanced, rigorous, seminal episodes and technical deep dives.\n` +
    `- Modules must be ordered 3–6 total.\n` +
    `- subtopics should be concise and map to episode discovery queries.\n` +
    `- suggestedShows are reputable and likely to have high Listen Score.\n` +
    `Respond with STRICT JSON, no markdown fences.`;

  const user = `topic: ${topic}\nmode: ${mode}`;

  const result = await model.generateContent({
    contents: [
      { role: "user", parts: [{ text: system }] },
      { role: "user", parts: [{ text: user }] },
    ],
    generationConfig: {
      temperature: 0.5,
      maxOutputTokens: 1024,
    },
  });

  const text = result.response.text().trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error(`Gemini did not return valid JSON: ${(e as Error).message}. Raw: ${text.slice(0, 300)}`);
  }

  const validated = syllabusSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(`Gemini JSON failed validation: ${validated.error.message}`);
  }
  return validated.data;
}

