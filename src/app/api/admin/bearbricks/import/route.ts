import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

const BATCH_SIZE = 50

interface ExistingBearbrick {
  id: string
  name: string
  seriesId: string
  sizePercentage: number
  releaseDate: Date | null
  description: string | null
}

type ClassifiedRow =
  | { kind: 'error'; rowNum: number; reason: string }
  | { kind: 'unchanged'; rowNum: number }
  | { kind: 'update'; rowNum: number; id: string; name: string; seriesId: string; size: number; releaseDate: Date | null; description: string | null }
  | { kind: 'create'; rowNum: number; id: string | null; name: string; seriesId: string; size: number; releaseDate: Date | null; description: string | null }

function parseDate(value: unknown): { ok: true; date: Date | null } | { ok: false } {
  if (value === '' || value === null || value === undefined) return { ok: true, date: null }
  if (value instanceof Date) return { ok: true, date: value }
  const parsed = new Date(String(value))
  if (isNaN(parsed.getTime())) return { ok: false }
  return { ok: true, date: parsed }
}

function sameDate(a: Date | null, b: Date | null) {
  if (a === null && b === null) return true
  if (a === null || b === null) return false
  return a.toISOString().split('T')[0] === b.toISOString().split('T')[0]
}

function classifyRow(
  row: Record<string, unknown>,
  rowNum: number,
  seriesByName: Map<string, string>,
  existingById: Map<string, ExistingBearbrick>
): ClassifiedRow {
  const id = String(row['ID'] ?? '').trim()
  const name = String(row['이름'] ?? '').trim()
  const seriesName = String(row['시리즈'] ?? '').trim()
  const sizeRaw = row['사이즈']
  const description = String(row['설명'] ?? '').trim() || null

  if (!name) return { kind: 'error', rowNum, reason: '이름이 비어있습니다' }

  const seriesId = seriesByName.get(seriesName)
  if (!seriesId) return { kind: 'error', rowNum, reason: `시리즈 "${seriesName}"를 찾을 수 없습니다` }

  const size = parseInt(String(sizeRaw), 10)
  if (isNaN(size) || size <= 0) {
    return { kind: 'error', rowNum, reason: `사이즈 값이 올바르지 않습니다: "${sizeRaw}"` }
  }

  const dateResult = parseDate(row['출시일'])
  if (!dateResult.ok) {
    return { kind: 'error', rowNum, reason: `출시일 형식이 올바르지 않습니다: "${row['출시일']}"` }
  }

  if (id) {
    const current = existingById.get(id)
    if (!current) {
      // Not an existing ID - treat as a new row using this as its ID
      // (this app's original data uses human-readable IDs like "S50-033",
      // not auto-generated ones, so a typed-in ID for a new row is expected)
      return { kind: 'create', rowNum, id, name, seriesId, size, releaseDate: dateResult.date, description }
    }

    const unchanged =
      current.name === name &&
      current.seriesId === seriesId &&
      current.sizePercentage === size &&
      sameDate(current.releaseDate, dateResult.date) &&
      (current.description || null) === description

    if (unchanged) return { kind: 'unchanged', rowNum }

    return { kind: 'update', rowNum, id, name, seriesId, size, releaseDate: dateResult.date, description }
  }

  return { kind: 'create', rowNum, id: null, name, seriesId, size, releaseDate: dateResult.date, description }
}

async function readRows(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer())
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
}

async function fetchExistingByIds(ids: string[]) {
  if (ids.length === 0) return new Map<string, ExistingBearbrick>()
  const rows = await prisma.bearbrick.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, seriesId: true, sizePercentage: true, releaseDate: true, description: true },
  })
  return new Map(rows.map((r) => [r.id, r]))
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

  const rawRows = await readRows(file)
  const seriesList = await prisma.series.findMany({ select: { id: true, name: true } })
  const seriesByName = new Map(seriesList.map((s) => [s.name, s.id]))

  if (mode === 'preview') {
    const ids = rawRows
      .map((row) => String(row['ID'] ?? '').trim())
      .filter((id) => id.length > 0)
    const existingById = await fetchExistingByIds(ids)

    let updateCount = 0
    let createCount = 0
    let unchangedCount = 0
    const errors: { rowNum: number; reason: string }[] = []
    const seenNewIds = new Set<string>()

    rawRows.forEach((row, index) => {
      const classified = classifyRow(row, index + 2, seriesByName, existingById)
      if (classified.kind === 'error') {
        errors.push({ rowNum: classified.rowNum, reason: classified.reason })
      } else if (classified.kind === 'unchanged') {
        unchangedCount += 1
      } else if (classified.kind === 'update') {
        updateCount += 1
      } else if (classified.kind === 'create' && classified.id && seenNewIds.has(classified.id)) {
        errors.push({ rowNum: classified.rowNum, reason: `ID "${classified.id}"가 파일 안에서 중복됩니다` })
      } else {
        if (classified.id) seenNewIds.add(classified.id)
        createCount += 1
      }
    })

    return NextResponse.json({
      updateCount,
      createCount,
      unchangedCount,
      errors,
      batchSize: BATCH_SIZE,
      totalBatches: Math.ceil(rawRows.length / BATCH_SIZE) || 0,
    })
  }

  // mode === 'apply' - paginate over the ORIGINAL row list (not the filtered
  // update/create list) so offsets stay valid even after earlier batches
  // in this same run have already written some of the rows.
  const offset = parseInt(String(formData.get('offset') ?? '0'), 10) || 0
  const total = rawRows.length
  const sliceRows = rawRows.slice(offset, offset + BATCH_SIZE)

  const sliceIds = sliceRows
    .map((row) => String(row['ID'] ?? '').trim())
    .filter((id) => id.length > 0)
  const existingById = await fetchExistingByIds(sliceIds)

  const classified = sliceRows.map((row, i) => classifyRow(row, offset + i + 2, seriesByName, existingById))
  const updates = classified.filter((c): c is Extract<ClassifiedRow, { kind: 'update' }> => c.kind === 'update')
  const rawCreates = classified.filter((c): c is Extract<ClassifiedRow, { kind: 'create' }> => c.kind === 'create')
  const batchErrors = classified.filter((c): c is Extract<ClassifiedRow, { kind: 'error' }> => c.kind === 'error')

  // Guard against two new rows in the same batch reusing the same typed-in ID
  const seenIds = new Set<string>()
  const creates: typeof rawCreates = []
  for (const c of rawCreates) {
    if (c.id && seenIds.has(c.id)) {
      batchErrors.push({ kind: 'error', rowNum: c.rowNum, reason: `ID "${c.id}"가 파일 안에서 중복됩니다` })
      continue
    }
    if (c.id) seenIds.add(c.id)
    creates.push(c)
  }

  if (updates.length > 0 || creates.length > 0) {
    const [defaultCategory, systemUser] = await Promise.all([
      prisma.categories.findFirst({ orderBy: { name: 'asc' } }),
      prisma.users.findFirst({ where: { email: 'system@bearbrickdb.com' } }),
    ])

    if (!defaultCategory || !systemUser) {
      return NextResponse.json({ error: '기본 카테고리 또는 시스템 사용자를 찾을 수 없습니다' }, { status: 500 })
    }

    try {
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
              ...(c.id ? { id: c.id } : {}),
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
    } catch (error) {
      console.error('Import batch failed:', error)
      return NextResponse.json(
        { error: `${offset + 2}~${offset + sliceRows.length + 1}행 처리 중 오류가 발생했습니다 (예: 중복된 ID)` },
        { status: 500 }
      )
    }
  }

  const processed = offset + sliceRows.length
  const done = processed >= total

  return NextResponse.json({
    batchUpdated: updates.length,
    batchCreated: creates.length,
    batchSkipped: batchErrors.length,
    batchErrors: batchErrors.map((e) => ({ rowNum: e.rowNum, reason: e.reason })),
    processed,
    total,
    done,
    nextOffset: processed,
  })
}
