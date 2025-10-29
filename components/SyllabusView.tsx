import type { SyllabusResult } from "@/types/recommendation";

export function SyllabusView({ syllabus }: { syllabus: SyllabusResult }) {
  return (
    <div className="space-y-8">
      {syllabus.modules.map((m, idx) => (
        <section key={idx}>
          <h3 className="text-lg font-semibold">Module {idx + 1}: {m.idea.moduleTitle}</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Objective: {m.idea.objective}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Why now: {m.idea.whyBeforeNext}</p>
          <ul className="mt-3 divide-y divide-gray-200 rounded-md border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
            {m.episodes.map((e, i) => (
              <li key={`${e.showTitle}-${e.episodeTitle}-${i}`} className="p-3">
                <div className="flex items-baseline justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">{e.episodeTitle}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">{e.showTitle}</div>
                  </div>
                  {e.releaseDate && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(e.releaseDate).toLocaleDateString()}</div>
                  )}
                </div>
                <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">{e.inclusionReason}</div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Score: {e.score.toFixed(2)}{e.listenScore ? ` · ListenScore ${e.listenScore}` : ""}</div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

