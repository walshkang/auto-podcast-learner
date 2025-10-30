"use client";

import clsx from "clsx";

export type Mode = "intro_101" | "deep_dive_201";

export function ModeToggle({
  value,
  onChange,
}: {
  value: Mode;
  onChange: (mode: Mode) => void;
}) {
  return (
    <div className="inline-flex rounded-full bg-gray-100 p-1 dark:bg-gray-800" role="tablist" aria-label="Mode selector">
      {([
        { key: "intro_101", label: "101" },
        { key: "deep_dive_201", label: "201" },
      ] as const).map((m) => (
        <button
          key={m.key}
          role="tab"
          aria-selected={value === m.key}
          className={clsx(
            "px-4 py-2 text-sm font-medium rounded-full transition",
            value === m.key
              ? "bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white"
              : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          )}
          onClick={() => onChange(m.key)}
          type="button"
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

