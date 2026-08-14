import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

interface ParsedRow {
  rowNum: number
  id: string
  name: string
  seriesId: string
  size: number
  releaseDate: Date | null
  description: string | null
}

interface RowError {
  rowNum: number
  reason: string
}

function parseDate(value: unknown): { ok: true; date: Date | null } | { ok: false } {
  if (value === '' || value === null || value === undefined) return { ok: true, date: null }
  if (value instanceof Date) return { ok: true, date: value }
  const parsed = new Date(String(value))
  if (isNaN(parsed.getTime())) return { ok: false }
  return { ok: true, date: parsed }
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.substring(7)
  if (token !== '4321') {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const mode = formData.get('mode') as string | null

  if (!file) {
    return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 })
  }
  if (mode !== 'preview' && mode !== 'apply') {
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

  const [seriesList, existingBearbricks, defaultCategory, systemUser] = await Promise.all([
    prisma.series.findMany({ select: { id: true, name: true } }),
    prisma.bearbrick.findMany({ select: { id: true } }),
    prisma.categories.findFirst({ orderBy: { name: 'asc' } }),
    prisma.users.findFirst({ where: { email: 'system@bearbrickdb.com' } }),
  ])

  const seriesByName = new Map(seriesList.map((s) => [s.name, s.id]))
  const existingIds = new Set(existingBearbricks.map((b) => b.id))

  const updates: ParsedRow[] = []
  const creates: ParsedRow[] = []
  const errors: RowError[] = []

  rawRows.forEach((row, index) => {
    const rowNum = index + 2 // header is row 1
    const id = String(row['ID'] ?? '').trim()
    const name = String(row['이름'] ?? '').trim()
    const seriesName = String(row['시리즈'] ?? '').trim()
    const sizeRaw = row['사이즈']
    const description = String(row['설명'] ?? '').trim() || null

    if (!name) {
      errors.push({ rowNum, reason: '이름이 비어있습니다' })
      return
    }

    const seriesId = seriesByName.get(seriesName)
    if (!seriesId) {
      errors.push({ rowNum, reason: `시리즈 "${seriesName}"를 찾을 수 없습니다` })
      return
    }

    const size = parseInt(String(sizeRaw), 10)
    if (isNaN(size) || size <= 0) {
      errors.push({ rowNum, reason: `사이즈 값이 올바르지 않습니다: "${sizeRaw}"` })
      return
    }

    const dateResult = parseDate(row['출시일'])
    if (!dateResult.ok) {
      errors.push({ rowNum, reason: `출시일 형식이 올바르지 않습니다: "${row['출시일']}"` })
      return
    }

    if (id) {
      if (!existingIds.has(id)) {
        errors.push({ rowNum, reason: `ID "${id}"에 해당하는 베어브릭을 찾을 수 없습니다` })
        return
      }
      updates.push({ rowNum, id, name, seriesId, size, releaseDate: dateResult.date, description })
    } else {
      creates.push({ rowNum, id: '', name, seriesId, size, releaseDate: dateResult.date, description })
    }
  })

  if (mode === 'preview') {
    return NextResponse.json({
      updateCount: updates.length,
      createCount: creates.length,
      errors,
    })
  }

  // mode === 'apply'
  if (!defaultCategory || !systemUser) {
    return NextResponse.json({ error: '기본 카테고리 또는 시스템 사용자를 찾을 수 없습니다' }, { status: 500 })
  }

  await prisma.$transaction([
    ...updates.map((u) =>
      prisma.bearbrick.update({
        where: { id: u.id },
        data: {
          name: u.name,
          seriesId: u.seriesId,
          sizePercentage: u.size,
          releaseDate: u.releaseDate,
          description: u.description,
        },
      })
    ),
    ...creates.map((c) =>
      prisma.bearbrick.create({
        data: {
          name: c.name,
          seriesId: c.seriesId,
          sizePercentage: c.size,
          releaseDate: c.releaseDate,
          description: c.description,
          categoryId: defaultCategory.id,
          createdById: systemUser.id,
        },
      })
    ),
  ])

  return NextResponse.json({
    updated: updates.length,
    created: creates.length,
    skipped: errors.length,
    errors,
  })
}
