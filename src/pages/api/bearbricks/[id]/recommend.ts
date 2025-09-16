import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    
    if (!session?.user?.email) {
      return res.status(401).json({ error: '로그인이 필요합니다.' })
    }

    const { id: bearbrickId } = req.query
    
    if (!bearbrickId || typeof bearbrickId !== 'string') {
      return res.status(400).json({ error: '올바른 베어브릭 ID가 필요합니다.' })
    }

    // 사용자 정보 조회
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' })
    }

    // 베어브릭 존재 확인
    const bearbrick = await prisma.bearbrick.findUnique({
      where: { id: bearbrickId }
    })

    if (!bearbrick) {
      return res.status(404).json({ error: '베어브릭을 찾을 수 없습니다.' })
    }

    if (req.method === 'POST') {
      // 추천 토글
      const existingRecommendation = await prisma.recommendation.findUnique({
        where: {
          userId_bearbrickId: {
            userId: user.id,
            bearbrickId: bearbrickId
          }
        }
      })

      if (existingRecommendation) {
        // 추천 취소
        await prisma.recommendation.delete({
          where: { id: existingRecommendation.id }
        })
        
        // 총 추천 수 조회
        const totalRecommendations = await prisma.recommendation.count({
          where: { bearbrickId }
        })

        res.status(200).json({
          recommended: false,
          totalRecommendations
        })
      } else {
        // 추천 추가
        await prisma.recommendation.create({
          data: {
            userId: user.id,
            bearbrickId
          }
        })

        // 총 추천 수 조회
        const totalRecommendations = await prisma.recommendation.count({
          where: { bearbrickId }
        })

        res.status(200).json({
          recommended: true,
          totalRecommendations
        })
      }
    } else if (req.method === 'GET') {
      // 추천 상태 조회
      const existingRecommendation = await prisma.recommendation.findUnique({
        where: {
          userId_bearbrickId: {
            userId: user.id,
            bearbrickId: bearbrickId
          }
        }
      })

      const totalRecommendations = await prisma.recommendation.count({
        where: { bearbrickId }
      })

      res.status(200).json({
        recommended: !!existingRecommendation,
        totalRecommendations
      })
    } else {
      res.setHeader('Allow', ['POST', 'GET'])
      res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    console.error('Recommendation error:', error)
    res.status(500).json({ error: '추천 처리 중 오류가 발생했습니다.' })
  } finally {
    await prisma.$disconnect()
  }
}