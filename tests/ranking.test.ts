import { describe, expect, it } from "vitest";
import { computeCompositeScore } from "@/lib/syllabus";

describe("computeCompositeScore", () => {
  const base = {
    listenScoreMin: 0,
    listenScoreMax: 100,
    showGlobalRankMin: 1,
    showGlobalRankMax: 1000000,
    recencyMin: 0,
    recencyMax: Date.now(),
    textMatchFraction: 0.5,
  };

  it("increases with higher listen score", () => {
    const low = computeCompositeScore({ ...base, listenScore: 10, showGlobalRank: 100000, recencyMs: 1_000_000 });
    const high = computeCompositeScore({ ...base, listenScore: 90, showGlobalRank: 100000, recencyMs: 1_000_000 });
    expect(high).toBeGreaterThan(low);
  });

  it("increases with better (lower) global rank", () => {
    const worse = computeCompositeScore({ ...base, listenScore: 50, showGlobalRank: 800000, recencyMs: 1_000_000 });
    const better = computeCompositeScore({ ...base, listenScore: 50, showGlobalRank: 10000, recencyMs: 1_000_000 });
    expect(better).toBeGreaterThan(worse);
  });

  it("increases with recency", () => {
    const old = computeCompositeScore({ ...base, listenScore: 50, showGlobalRank: 100000, recencyMs: 1_000_000 });
    const recent = computeCompositeScore({ ...base, listenScore: 50, showGlobalRank: 100000, recencyMs: Date.now() });
    expect(recent).toBeGreaterThan(old);
  });
});

