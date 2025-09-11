import NextAuth, { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { PrismaClient, UserRole } from '@prisma/client'

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
    session: async ({ session, token }) => {
      if (session?.user && token?.sub) {
        session.user.id = token.sub
        // Get user role from database
        const user = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true }
        })
        session.user.role = user?.role || UserRole.USER
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
        // Set andyjin@gmail.com as OWNER on first sign-in
        if (user.email === 'andyjin@gmail.com') {
          await prisma.user.upsert({
            where: { email: user.email },
            update: { role: UserRole.OWNER },
            create: {
              email: user.email,
              name: user.name,
              image: user.image,
              role: UserRole.OWNER
            }
          })
        }
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
}

export default NextAuth(authOptions)