import * as XLSX from 'xlsx'
import { Player } from '../models/Player.js'
import { PlayerRole, PlayerStatus, PLAYER_ROLES, isOverseas } from '../models/enums.js'
import { AppError } from '../utils/errors.js'

export interface ImportRow {
  rowNumber: number
  name: string
  role: string
  rawRole: string
  nationality: string
  isOverseas: boolean
  ranking: number
  basePrice: number
  importOrder: number
  errors: string[]
}

const HEADER_CANDIDATES: Record<string, string[]> = {
  name: ['player', 'player name', 'name', 'player name'],
  role: ['role'],
  nationality: ['nationality', 'country', 'country/nationality'],
  ranking: ['ipl ranking', 'ranking', 'rating', 'ipl rating', 'iplrank'],
  basePrice: ['base price', 'base price (₹ crore)', 'base price (rs crore)', 'base price (crore)'],
}

function findHeaderIndex(headers: string[]): Record<string, number> {
  const norm: (s: string) => string = (s) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()

  const result: Record<string, number> = {}
  for (const [key, candidates] of Object.entries(HEADER_CANDIDATES)) {
    const normalized = new Set(candidates.map(norm))
    const idx = headers.findIndex((h) => normalized.has(norm(h)))
    if (idx >= 0) result[key] = idx
  }
  return result
}

export function basePriceFromRanking(ranking: number): number {
  if (ranking <= 10) return 1
  if (ranking <= 25) return 0.8
  if (ranking <= 50) return 0.6
  if (ranking <= 75) return 0.4
  return 0.2
}

function normalizeRole(raw: string): string | null {
  const r = raw.trim().toLowerCase()
  if (r.includes('wk') || r.includes('wicket')) return PlayerRole.WICKETKEEPER
  if (r.includes('all-round') || r.includes('all round') || r.includes('allround')) return PlayerRole.ALL_ROUNDER
  if (r.includes('bowl')) return PlayerRole.BOWLER
  if (r.includes('bat') || r === 'batter' || r === 'batsman') return PlayerRole.BATSMAN
  return null
}

export function parsePlayersFromBuffer(buffer: Buffer): { rows: ImportRow[]; usedColumns: string[] } {
  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(buffer, { type: 'buffer' })
  } catch (err) {
    throw new AppError(`Unable to read spreadsheet: ${(err as Error).message}`, 400)
  }

  // Pick the first sheet that contains player data.
  let sheet: XLSX.WorkSheet | undefined
  for (const name of workbook.SheetNames) {
    const candidate = workbook.Sheets[name]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(candidate, { defval: '' })
    if (rows.length > 0 && findHeaderIndex(Object.keys(rows[0]))['name'] !== undefined) {
      sheet = candidate
      break
    }
  }
  if (!sheet) throw new AppError('No sheet with a Player/Name column found', 400)

  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  const headers = Object.keys(json[0] ?? {})
  const idx = findHeaderIndex(headers)

  if (idx.name === undefined) throw new AppError('Missing required column: Player/Name', 400)
  if (idx.role === undefined) throw new AppError('Missing required column: Role', 400)
  if (idx.nationality === undefined) throw new AppError('Missing required column: Nationality', 400)
  if (idx.ranking === undefined) throw new AppError('Missing required column: IPL Ranking', 400)

  const rows: ImportRow[] = []
  const seenNames = new Set<string>()

  json.forEach((raw, i) => {
    const rowNumber = i + 2 // 1-based, after header
    const name = String(raw[headers[idx.name]] ?? '').trim()
    const rawRole = String(raw[headers[idx.role]] ?? '').trim()
    const nationality = String(raw[headers[idx.nationality]] ?? '').trim()
    const rankingRaw = raw[headers[idx.ranking]]

    const errors: string[] = []
    if (!name) errors.push('Name is required')
    if (!rawRole) errors.push('Role is required')
    if (!nationality) errors.push('Nationality is required')

    const role = rawRole ? normalizeRole(rawRole) : null
    if (rawRole && !role) errors.push(`Unknown role "${rawRole}"`)

    // IPL Ranking is an ORDINAL ranking: 1 = best player, N = lowest-ranked
    // player in the file. It must be a positive whole number, is NOT capped at
    // 100, is validated against the number of valid rows, and must be unique.
    const rankingNum = Number(rankingRaw)
    const rankingIsValid = rankingRaw !== '' && !Number.isNaN(rankingNum) && Number.isInteger(rankingNum) && rankingNum >= 1
    if (rankingRaw === '' || rankingRaw == null) {
      errors.push('IPL Ranking is required')
    } else if (Number.isNaN(rankingNum) || !Number.isInteger(rankingNum) || rankingNum < 1) {
      errors.push('IPL Ranking must be a whole number from 1 upward')
    }

    // Base price is derived from the ordinal ranking (lower rank = better
    // player = higher base-price tier). The Excel Base Price column is ignored.
    const basePrice = rankingIsValid ? basePriceFromRanking(rankingNum) : 0

    if (name && seenNames.has(name.toLowerCase())) {
      errors.push('Duplicate name within file')
    }
    if (name) seenNames.add(name.toLowerCase())

    rows.push({
      rowNumber,
      name,
      role: role ?? rawRole,
      rawRole,
      nationality,
      isOverseas: isOverseas(nationality),
      ranking: rankingIsValid ? rankingNum : 0,
      basePrice,
      importOrder: 0,
      errors,
    })
  })

  // Range check: the maximum permitted ranking equals the number of valid rows
  // in this file (e.g. 110 players => ranks 1-110). Not a hardcoded limit.
  const maxRank = rows.filter((r) => r.errors.length === 0).length
  for (const row of rows) {
    if (row.errors.length === 0 && row.ranking > maxRank) {
      row.errors.push(`IPL Ranking ${row.ranking} is out of range: file has ${maxRank} valid players, so max ranking is ${maxRank}`)
    }
  }

  // Uniqueness: each ordinal ranking may be used by only one player.
  const seenRanks = new Map<number, string>()
  for (const row of rows) {
    if (row.errors.length > 0 || row.ranking < 1) continue
    const previous = seenRanks.get(row.ranking)
    if (previous !== undefined) {
      row.errors.push(`Duplicate IPL Ranking ${row.ranking} (already used by "${previous}")`)
    } else {
      seenRanks.set(row.ranking, row.name || `row ${row.rowNumber}`)
    }
  }

  // Assign explicit import order to valid rows, sequentially in Excel order
  // (1 = first valid row in the file, 2 = second, ...). Never by player name.
  let orderCounter = 0
  for (const row of rows) {
    if (row.errors.length === 0) {
      orderCounter += 1
      row.importOrder = orderCounter
    }
  }

  const validRows = rows.filter((r) => r.errors.length === 0).length
  console.log(`[IMPORT] Excel rows detected: ${rows.length}, Valid players parsed: ${validRows}`)

  return { rows, usedColumns: headers }
}

// Confirm import: insert or update players that are valid, skip duplicates already present.
export async function confirmImport(rows: ImportRow[]) {
  const valid = rows.filter((r) => r.errors.length === 0)
  const invalidCount = rows.length - valid.length

  let inserted = 0
  let updated = 0
  let skippedDuplicates = 0
  const errors: string[] = []

  for (const row of valid) {
    const existing = await Player.findOne({ name: row.name })
    const payload = {
      name: row.name,
      role: row.role as (typeof PLAYER_ROLES)[number],
      nationality: row.nationality,
      isOverseas: row.isOverseas,
      ranking: row.ranking,
      basePrice: row.basePrice,
      importOrder: row.importOrder,
    }
    if (existing) {
      // Never clobber live auction fields (status, soldPrice, teamId).
      if (existing.status === PlayerStatus.SOLD) {
        skippedDuplicates += 1
        continue
      }
      existing.set(payload)
      await existing.save()
      updated += 1
    } else {
      await Player.create({ ...payload, status: PlayerStatus.AVAILABLE })
      inserted += 1
    }
  }

  const totalInDb = await Player.countDocuments()
  console.log(
    `[IMPORT] Players saved to MongoDB: ${inserted} inserted, ${updated} updated, ${skippedDuplicates} duplicate-skipped (${invalidCount} invalid skipped). Total players in MongoDB: ${totalInDb}`,
  )

  return {
    inserted,
    updated,
    skippedDuplicates,
    invalidCount,
    errors,
  }
}
