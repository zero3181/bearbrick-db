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
    Name: b.name,
    Series: b.series?.name || '',
    Category: b.categories?.name || '',
    Secret: b.isSecret ? 'Y' : 'N',
    ReleaseDate: b.releaseDate ? b.releaseDate.toISOString().split('T')[0] : '',
    Description: b.description || '',
  }))

  const worksheet = XLSX.utils.json_to_sheet(rows)
  worksheet['!cols'] = [
    { wch: 26 }, // ID
    { wch: 30 }, // Name
    { wch: 14 }, // Series
    { wch: 12 }, // Category
    { wch: 8 },  // Secret
    { wch: 12 }, // ReleaseDate
    { wch: 40 }, // Description
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Bearbricks')

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="bearbricks-${new Date().toISOString().split('T')[0]}.xlsx"`,
    },
  })
}
