import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/serverAuth'
import * as XLSX from 'xlsx'

export async function GET() {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const bearbricks = await prisma.bearbrick.findMany({
    include: {
      series: { select: { name: true } },
      categories: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const rows = bearbricks.map((b) => ({
    ID: b.id,
    이름: b.name,
    시리즈: b.series?.name || '',
    카테고리: b.categories?.name || '',
    Secret: b.isSecret ? 'Y' : 'N',
    출시일: b.releaseDate ? b.releaseDate.toISOString().split('T')[0] : '',
    설명: b.description || '',
  }))

  const worksheet = XLSX.utils.json_to_sheet(rows)
  worksheet['!cols'] = [
    { wch: 26 }, // ID
    { wch: 30 }, // 이름
    { wch: 14 }, // 시리즈
    { wch: 12 }, // 카테고리
    { wch: 8 },  // Secret
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
