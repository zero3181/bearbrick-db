import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { UserRole } from "@prisma/client"
import { prisma } from "./prisma"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'select_account',
        },
      },
    })
  ],
  callbacks: {
    session: async ({ session, user }) => {
      if (session?.user && user) {
        session.user.id = user.id
        session.user.role = (user as { role?: UserRole }).role || UserRole.USER
      }
      return session
    },
    signIn: async ({ user }) => {
      // First-time sign-in by the configured owner email gets promoted to OWNER
      if (user.email && process.env.OWNER_EMAIL && user.email === process.env.OWNER_EMAIL) {
        const existing = await prisma.user.findUnique({ where: { email: user.email } })
        if (existing && existing.role !== UserRole.OWNER) {
          await prisma.user.update({ where: { id: existing.id }, data: { role: UserRole.OWNER } })
        }
      }
      return true
    },
  },
  session: {
    strategy: 'database',
  },
  pages: {
    signIn: '/',
  },
}
