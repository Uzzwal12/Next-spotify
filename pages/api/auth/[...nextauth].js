import NextAuth from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";
import spotifyApi, { LOGIN_URL } from "../../../utils/spotify";

const refreshAccessToken = async (token) => {
  try {
    spotifyApi.setAccessToken(token.accessToken);
    spotifyApi.setRefreshToken(token.refreshToken);
    const { body: refreshedToken } = await spotifyApi.refreshAccessToken();
    console.log("refreshedToken", refreshedToken);

    return {
      ...token,
      accessToken: refreshedToken.access_token,
      accessTokenExpires: Date.now() + refreshedToken.expires_in * 1000,
      refreshToken: refreshedToken.refresh_token && token.refreshToken,
    };
  } catch (error) {
    console.log(error);
    return {
      ...token,
      error: "refreshAccessTokenError",
    };
  }
};

export default NextAuth({
  providers: [
    SpotifyProvider({
      clientId: process.env.NEXT_PUBLIC_CLIENT_ID,
      clientSecret: process.env.NEXT_PUBLIC_CLIENT_SECRET,
      authorization: LOGIN_URL,
    }),
  ],
  secret: process.env.JWT_SECRET,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, account, user }) {
      console.log("token", token);
      console.log("account", account);
      //initial sign in
      if (account && user) {
        return {
          ...token,
          accessToken: account.access_token,
          accessTokenExpires: account.expires_in * 1000,
          refreshToken: account.refresh_token,
          username: account.providerAccountId,
        };
      }
      // return previous token if access token is not expired
      if (Date.now() < token.accessTokenExpires) {
        return token;
      }
      // access token is expired
      return await refreshAccessToken(token);
    },
    async session({ session, token }) {
      (session.user.accessToken = token.accessToken),
        (session.user.refreshToken = token.refreshToken),
        (session.user.username = token.username);

      return session;
    },
  },
});
