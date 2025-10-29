# auto-podcast-learner

Generate syllabus-like podcast playlists (101/201) for any topic using Google Gemini + ListenNotes, then export them as private Spotify playlists.

## Quickstart

1) Install dependencies

```
npm install
```

2) Create `.env.local` in the project root with:

```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=replace_with_long_random_string

SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

GOOGLE_API_KEY=your_gemini_api_key
LISTENNOTES_API_KEY=your_listennotes_api_key
```

3) Spotify app setup
- Redirect URI: `http://localhost:3000/api/auth/callback/spotify`
- Scopes: `playlist-modify-private user-read-email`

4) Run the dev server

```
npm run dev
```

Open http://localhost:3000

## Notes
- 101 mode prioritizes beginner-friendly overviews and scaffolding.
- 201 mode prioritizes depth, seminal episodes, and technical rigor.
- ListenNotes popularity signals influence ranking; re-ranking can be refined.