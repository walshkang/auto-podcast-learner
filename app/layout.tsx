import type { Metadata } from "next";
import "./globals.css";
import { ReactNode } from "react";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "Podcast Learner",
  description: "Generate syllabus-like podcast playlists (101/201) and export to Spotify",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <div className="mx-auto max-w-5xl p-6">
          <header className="mb-8 flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight">Podcast Learner</h1>
          </header>
          <main>
            <AuthProvider>{children}</AuthProvider>
          </main>
        </div>
      </body>
    </html>
  );
}

