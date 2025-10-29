import NextAuth from "next-auth";
import Spotify from "next-auth/providers/spotify";

const SPOTIFY_OAUTH_SCOPES = [
  "playlist-modify-private",
  "user-read-email",
].join(" ");

async function refreshAccessToken(token: any) {
  try {
    const basic = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString("base64");
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: token.refresh_token,
      }),
    });
    const refreshed = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(refreshed));

    return {
      ...token,
      access_token: refreshed.access_token,
      expires_at: Math.floor(Date.now() / 1000) + (refreshed.expires_in ?? 3600),
      refresh_token: refreshed.refresh_token ?? token.refresh_token,
    };
  } catch (error) {
    console.error("Error refreshing Spotify token", error);
    return { ...token, error: "RefreshAccessTokenError" as const };
  }
}

export const authOptions = {
  providers: [
    Spotify({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: SPOTIFY_OAUTH_SCOPES,
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }: any) {
      // Initial sign-in
      if (account && user) {
        return {
          access_token: account.access_token,
          refresh_token: account.refresh_token,
          expires_at: Math.floor(Date.now() / 1000) + (account.expires_in ?? 3600),
          user,
        };
      }

      // Return previous token if it's still valid
      if (token.expires_at && Date.now() / 1000 < token.expires_at - 60) {
        return token;
      }

      // Refresh token
      return await refreshAccessToken(token);
    },
    async session({ session, token }: any) {
      session.user = token.user;
      (session as any).accessToken = token.access_token;
      (session as any).error = token.error;
      return session;
    },
  },
  session: { strategy: "jwt" as const },
  pages: {},
};

export const { handlers: { GET, POST }, auth } = NextAuth(authOptions as any);

