import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "./db";

export const devLoginEnabled = process.env.NODE_ENV !== "production" && process.env.ALLOW_DEV_LOGIN === "true";

function emailAllowed(email: string): boolean {
  const domains = (process.env.ALLOWED_EMAIL_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  if (domains.length === 0) return true;
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return domains.some((d) => domain === d || domain.endsWith("." + d));
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 60 },
  pages: { signIn: "/signin", error: "/signin" },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    ...(devLoginEnabled
      ? [
          CredentialsProvider({
            id: "dev",
            name: "Dev login",
            credentials: { email: { label: "Email", type: "email" } },
            async authorize(creds) {
              const email = creds?.email?.trim().toLowerCase();
              return email ? { id: email, email, name: email.split("@")[0] } : null;
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      const email = user.email?.toLowerCase();
      if (!email) return false;
      if (account?.provider === "google" && (profile as { email_verified?: boolean })?.email_verified === false) {
        return false;
      }
      return emailAllowed(email);
    },
    async jwt({ token, user }) {
      // `user` is only present on sign-in: create or update our user row then.
      if (user?.email) {
        const email = user.email.toLowerCase();
        const dbUser = await prisma.user.upsert({
          where: { email },
          create: { email, name: user.name, image: user.image },
          update: { name: user.name ?? undefined, image: user.image ?? undefined },
        });
        token.uid = dbUser.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.uid) session.user.id = token.uid as string;
      return session;
    },
  },
};

export async function getSessionUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}
