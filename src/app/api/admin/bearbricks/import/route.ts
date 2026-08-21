import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/serverAuth'
import * as XLSX from 'xlsx'

const BATCH_SIZE = 50

interface ExistingBearbrick {
  id: string
  name: string
  seriesId: string
  categoryId: string | null
  releaseDate: Date | null
  description: string | null
  isSecret: boolean
}

type ClassifiedRow =
  | { kind: 'error'; rowNum: number; reason: string }
  | { kind: 'unchanged'; rowNum: number }
  | { kind: 'update'; rowNum: number; id: string; name: string; seriesId: string; categoryId: string | null; releaseDate: Date | null; description: string | null; isSecret: boolean }
  | { kind: 'create'; rowNum: number; id: string | null; name: string; seriesId: string; categoryId: string | null; releaseDate: Date | null; description: string | null; isSecret: boolean }

function parseSecret(value: unknown): boolean {
  const normalized = String(value ?? '').trim().toUpperCase()
  return ['Y', 'YES', 'TRUE', '1', 'O'].includes(normalized)
}

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

function getCurrentSeason() {
  const month = new Date().getMonth() + 1
  if (month >= 3 && month <= 5) return 'Spring'
  if (month >= 6 && month <= 8) return 'Summer'
  if (month >= 9 && month <= 11) return 'Fall'
  return 'Winter'
}

function seriesNamesIn(rows: Record<string, unknown>[]) {
  return [...new Set(rows.map((row) => String(row['Series'] ?? '').trim()).filter((n) => n.length > 0))]
}

// Creates any series referenced in `names` that don't exist yet, numbering
// them sequentially after the current highest series number, and adds the
// new id to `seriesByName` so row classification can resolve them.
async function ensureSeriesExist(names: string[], seriesByName: Map<string, string>) {
  const missing = names.filter((n) => !seriesByName.has(n))
  if (missing.length === 0) return 0

  const highest = await prisma.series.aggregate({ _max: { number: true } })
  let nextNumber = (highest._max.number ?? 0) + 1

  for (const name of missing) {
    const created = await prisma.series.create({
      data: {
        id: crypto.randomUUID(),
        number: nextNumber,
        name,
        season: getCurrentSeason(),
        releaseYear: new Date().getFullYear(),
        updatedAt: new Date(),
      },
    })
    seriesByName.set(name, created.id)
    nextNumber += 1
  }

  return missing.length
}

function classifyRow(
  row: Record<string, unknown>,
  rowNum: number,
  seriesByName: Map<string, string>,
  categoryByName: Map<string, string>,
  existingById: Map<string, ExistingBearbrick>
): ClassifiedRow {
  const id = String(row['ID'] ?? '').trim()
  const name = String(row['Name'] ?? '').trim()
  const seriesName = String(row['Series'] ?? '').trim()
  const categoryName = String(row['Category'] ?? '').trim()
  const description = String(row['Description'] ?? '').trim() || null
  const isSecret = parseSecret(row['Secret'])

  if (!name) return { kind: 'error', rowNum, reason: 'Name is empty' }

  const seriesId = seriesByName.get(seriesName)
  if (!seriesId) return { kind: 'error', rowNum, reason: `Series "${seriesName}" not found` }

  let categoryId: string | null = null
  if (categoryName) {
    const found = categoryByName.get(categoryName)
    if (!found) return { kind: 'error', rowNum, reason: `Category "${categoryName}" not found` }
    categoryId = found
  }

  const dateResult = parseDate(row['ReleaseDate'])
  if (!dateResult.ok) {
    return { kind: 'error', rowNum, reason: `Invalid release date format: "${row['ReleaseDate']}"` }
  }

  if (id) {
    const current = existingById.get(id)
    if (!current) {
      // Not an existing ID - treat as a new row using this as its ID
      // (this app's original data uses human-readable IDs like "S50-033",
      // not auto-generated ones, so a typed-in ID for a new row is expected)
      return { kind: 'create', rowNum, id, name, seriesId, categoryId, releaseDate: dateResult.date, description, isSecret }
    }

    const unchanged =
      current.name === name &&
      current.seriesId === seriesId &&
      current.categoryId === categoryId &&
      sameDate(current.releaseDate, dateResult.date) &&
      (current.description || null) === description &&
      current.isSecret === isSecret

    if (unchanged) return { kind: 'unchanged', rowNum }

    return { kind: 'update', rowNum, id, name, seriesId, categoryId, releaseDate: dateResult.date, description, isSecret }
  }

  return { kind: 'create', rowNum, id: null, name, seriesId, categoryId, releaseDate: dateResult.date, description, isSecret }
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
    select: { id: true, name: true, seriesId: true, categoryId: true, releaseDate: true, description: true, isSecret: true },
  })
  return new Map(rows.map((r) => [r.id, r]))
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const mode = formData.get('mode') as string | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  if (mode !== 'preview' && mode !== 'apply') {
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
  }

  const rawRows = await readRows(file)
  const seriesList = await prisma.series.findMany({ select: { id: true, name: true } })
  const seriesByName = new Map(seriesList.map((s) => [s.name, s.id]))
  const categoryList = await prisma.categories.findMany({ select: { id: true, name: true } })
  const categoryByName = new Map(categoryList.map((c) => [c.name, c.id]))

  if (mode === 'preview') {
    const ids = rawRows
      .map((row) => String(row['ID'] ?? '').trim())
      .filter((id) => id.length > 0)
    const existingById = await fetchExistingByIds(ids)

    // Don't actually create series during a preview - just note which
    // names would need to be, and let classification treat them as valid
    // so the counts reflect what apply will actually do.
    const newSeriesNames = seriesNamesIn(rawRows).filter((n) => !seriesByName.has(n))
    const previewSeriesByName = new Map(seriesByName)
    newSeriesNames.forEach((n) => previewSeriesByName.set(n, '__PENDING__'))

    let updateCount = 0
    let createCount = 0
    let unchangedCount = 0
    const errors: { rowNum: number; reason: string }[] = []
    const seenNewIds = new Set<string>()

    rawRows.forEach((row, index) => {
      const classified = classifyRow(row, index + 2, previewSeriesByName, categoryByName, existingById)
      if (classified.kind === 'error') {
        errors.push({ rowNum: classified.rowNum, reason: classified.reason })
      } else if (classified.kind === 'unchanged') {
        unchangedCount += 1
      } else if (classified.kind === 'update') {
        updateCount += 1
      } else if (classified.kind === 'create' && classified.id && seenNewIds.has(classified.id)) {
        errors.push({ rowNum: classified.rowNum, reason: `ID "${classified.id}" is duplicated within the file` })
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
      newSeriesNames,
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

  const newSeriesCreated = await ensureSeriesExist(seriesNamesIn(sliceRows), seriesByName)

  const classified = sliceRows.map((row, i) => classifyRow(row, offset + i + 2, seriesByName, categoryByName, existingById))
  const updates = classified.filter((c): c is Extract<ClassifiedRow, { kind: 'update' }> => c.kind === 'update')
  const rawCreates = classified.filter((c): c is Extract<ClassifiedRow, { kind: 'create' }> => c.kind === 'create')
  const batchErrors = classified.filter((c): c is Extract<ClassifiedRow, { kind: 'error' }> => c.kind === 'error')

  // Guard against two new rows in the same batch reusing the same typed-in ID
  const seenIds = new Set<string>()
  const creates: typeof rawCreates = []
  for (const c of rawCreates) {
    if (c.id && seenIds.has(c.id)) {
      batchErrors.push({ kind: 'error', rowNum: c.rowNum, reason: `ID "${c.id}" is duplicated within the file` })
      continue
    }
    if (c.id) seenIds.add(c.id)
    creates.push(c)
  }

  if (updates.length > 0 || creates.length > 0) {
    try {
      await prisma.$transaction([
        ...updates.map((u) =>
          prisma.bearbrick.update({
            where: { id: u.id },
            data: {
              name: u.name,
              seriesId: u.seriesId,
              categoryId: u.categoryId,
              releaseDate: u.releaseDate,
              description: u.description,
              isSecret: u.isSecret,
            },
          })
        ),
        ...creates.map((c) =>
          prisma.bearbrick.create({
            data: {
              ...(c.id ? { id: c.id } : {}),
              name: c.name,
              seriesId: c.seriesId,
              categoryId: c.categoryId,
              sizePercentage: 100,
              releaseDate: c.releaseDate,
              description: c.description,
              isSecret: c.isSecret,
              createdById: session.user.id,
            },
          })
        ),
      ])
    } catch (error) {
      console.error('Import batch failed:', error)
      return NextResponse.json(
        { error: `An error occurred processing rows ${offset + 2}-${offset + sliceRows.length + 1} (e.g. a duplicate ID)` },
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
    newSeriesCreated,
    processed,
    total,
    done,
    nextOffset: processed,
  })
}
