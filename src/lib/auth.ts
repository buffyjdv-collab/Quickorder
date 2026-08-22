import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "./db";
import bcrypt from "bcryptjs";
import type { SessionUser } from "./types";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await db.user.findUnique({ where: { email: credentials.email } });
        if (!user || !user.active) return null;
        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role, businessId: user.businessId };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) { token.id = user.id; token.role = (user as any).role; token.businessId = (user as any).businessId; }
      return token;
    },
    async session({ session, token }) {
      const su: SessionUser = { id: token.id as string, email: session.user?.email || "", name: session.user?.name || "", role: token.role as any, businessId: token.businessId as string | null, businessName: null };
      if (su.businessId) { const biz = await db.business.findUnique({ where: { id: su.businessId } }); su.businessName = biz?.name || null; }
      return { ...session, user: su };
    },
  },
  session: { strategy: "jwt" },
  pages: { signIn: "/" },
  secret: process.env.NEXTAUTH_SECRET,
};
