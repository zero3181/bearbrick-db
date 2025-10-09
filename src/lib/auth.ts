import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { PrismaClient, UserRole } from "@prisma/client"

const prisma = new PrismaClient()

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],
  callbacks: {
    session: async ({ session, user }) => {
      // Database session strategy를 사용하므로 user 객체에서 정보 가져오기
      if (session?.user && user) {
        session.user.id = user.id
        session.user.role = (user as any).role || UserRole.USER
      }
      return session
    },
    signIn: async ({ user, account, profile }) => {
      console.log('SignIn callback - User:', user.email, 'Account:', account?.provider)
      return true
    },
  },
  session: {
    strategy: 'database',
  },
  pages: {
    signIn: '/auth/signin',
  },
  debug: true, // 운영 환경에서도 로그 확인을 위해 임시로 활성화
  events: {
    linkAccount: async ({ user, account, profile }) => {
      console.log('Account linked - User:', user.email, 'Provider:', account.provider);
    },
  },
  logger: {
    error(code, metadata) {
      console.error('NextAuth Error:', code, metadata)
    },
    warn(code) {
      console.warn('NextAuth Warning:', code)
    },
    debug(code, metadata) {
      console.log('NextAuth Debug:', code, metadata)
    }
  }
}