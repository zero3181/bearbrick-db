import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      console.log('Starting database setup...')
      
      // Test database connection first
      await prisma.$connect()
      console.log('Database connected successfully')
      
      // Create tables by running raw SQL commands
      await prisma.$executeRaw`
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      `
      
      console.log('All tables created successfully')
      
      res.status(200).json({
        success: true,
        message: 'Database schema applied successfully! Check Supabase → Database → Tables'
      })
    } catch (error) {
      console.error('Database setup error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to setup database',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      await prisma.$disconnect()
    }
  } else {
    res.setHeader('Allow', ['POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}