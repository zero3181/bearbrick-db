import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.substring(7)
  if (token !== '4321') {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const bearbricks = await prisma.bearbrick.findMany({
    include: { series: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const rows = bearbricks.map((b) => ({
    ID: b.id,
    이름: b.name,
    시리즈: b.series?.name || '',
    사이즈: b.sizePercentage,
    출시일: b.releaseDate ? b.releaseDate.toISOString().split('T')[0] : '',
    설명: b.description || '',
  }))

  const worksheet = XLSX.utils.json_to_sheet(rows)
  worksheet['!cols'] = [
    { wch: 26 }, // ID
    { wch: 30 }, // 이름
    { wch: 14 }, // 시리즈
    { wch: 8 },  // 사이즈
    { wch: 12 }, // 출시일
    { wch: 40 }, // 설명
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '베어브릭')

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="bearbricks-${new Date().toISOString().split('T')[0]}.xlsx"`,
    },
  })
}
