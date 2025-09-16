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
    session: async ({ session, token, user }) => {
      if (session?.user) {
        if (token?.sub) {
          session.user.id = token.sub
        } else if (user?.id) {
          session.user.id = user.id
        }

        // Get user role from database
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { role: true },
          });

          session.user.role = dbUser?.role || UserRole.USER;
        } catch (error) {
          console.error('Error fetching user role:', error);
          session.user.role = UserRole.USER;
        }
      }
      return session
    },
    jwt: async ({ user, token }) => {
      if (user) {
        token.uid = user.id
      }
      return token
    },
    signIn: async ({ user, account, profile }) => {
      try {
        // 임시로 OWNER 역할 설정 비활성화 (데이터베이스 스키마 동기화 후 활성화)
        console.log('User signed in:', user.email)
        return true
      } catch (error) {
        console.error('SignIn callback error:', error)
        // Allow sign-in to continue even if role setting fails
        return true
      }
    },
  },
  session: {
    strategy: 'database',
  },
  pages: {
    signIn: '/auth/signin',
  },
  // 개발 환경에서 계정 연결 문제 해결
  debug: process.env.NODE_ENV === 'development',
  // 이메일 계정 연결 허용 (개발 환경에서만)
  events: {
    linkAccount: async ({ user, account, profile }) => {
      console.log('Account linked:', { user, account, profile });
    },
  },
}