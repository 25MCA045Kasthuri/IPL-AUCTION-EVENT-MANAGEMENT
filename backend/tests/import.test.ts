import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { connect, disconnect, cleanDB, seedTeams, getTeamByShort } from './helpers.js'
import { parsePlayersFromBuffer, confirmImport, basePriceFromRanking } from '../src/services/importService.js'
import { Player } from '../src/models/Player.js'

beforeAll(async () => {
  await connect()
})

afterAll(async () => {
  await disconnect()
})

beforeEach(async () => {
  await cleanDB()
  await seedTeams()
})

afterEach(async () => {
  await cleanDB()
})

function makeWorkbook(rows: Record<string, unknown>[]) {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, 'Player Stats')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

describe('Excel import validation', () => {
  it('parses a valid spreadsheet and normalizes roles', () => {
    const buf = makeWorkbook([
      { Player: 'Virat Kohli', Role: 'Batter', Nationality: 'India', 'IPL Ranking': 1, 'Base Price (₹ Crore)': 2 },
      { Player: 'Trent Boult', Role: 'Bowler', Nationality: 'New Zealand', 'IPL Ranking': 2, 'Base Price (₹ Crore)': 2 },
      { Player: 'MS Dhoni', Role: 'Wicketkeeper-Batter', Nationality: 'India', 'IPL Ranking': 3, 'Base Price (₹ Crore)': 2 },
    ])
    const { rows } = parsePlayersFromBuffer(buf)
    expect(rows).toHaveLength(3)
    expect(rows.every((r) => r.errors.length === 0)).toBe(true)
    expect(rows[0].role).toBe('Batsman')
    expect(rows[1].role).toBe('Bowler')
    expect(rows[2].role).toBe('Wicketkeeper')
    expect(rows[1].isOverseas).toBe(true)
    // Base price is derived from the ordinal ranking tier, not the column.
    expect(rows[0].basePrice).toBe(1) // rank 1-10 => 1.0 Cr
    expect(rows[1].basePrice).toBe(1) // rank 1-10 => 1.0 Cr
    expect(rows[2].basePrice).toBe(1) // rank 1-10 => 1.0 Cr
  })

  it('derives base price from the ranking tier (lower rank = higher price)', () => {
    expect(basePriceFromRanking(1)).toBe(1)
    expect(basePriceFromRanking(10)).toBe(1)
    expect(basePriceFromRanking(11)).toBe(0.8)
    expect(basePriceFromRanking(25)).toBe(0.8)
    expect(basePriceFromRanking(26)).toBe(0.6)
    expect(basePriceFromRanking(50)).toBe(0.6)
    expect(basePriceFromRanking(51)).toBe(0.4)
    expect(basePriceFromRanking(75)).toBe(0.4)
    expect(basePriceFromRanking(76)).toBe(0.2)
    expect(basePriceFromRanking(110)).toBe(0.2)
  })

  it('accepts >100 ordinal rankings (110 players, ranks 1-110)', () => {
    const buf = makeWorkbook(
      Array.from({ length: 110 }, (_, i) => ({
        Player: `Player ${i + 1}`,
        Role: 'Batter',
        Nationality: 'India',
        'IPL Ranking': i + 1,
        'Base Price (₹ Crore)': 0.2,
      })),
    )
    const { rows } = parsePlayersFromBuffer(buf)
    expect(rows).toHaveLength(110)
    expect(rows.filter((r) => r.errors.length === 0)).toHaveLength(110)
    // Highest ordinal rank is valid (regression: was rejected with max 100).
    expect(rows.some((r) => r.ranking === 110 && r.errors.length === 0)).toBe(true)
  })

  it('catches invalid rows', () => {
    const buf = makeWorkbook([
      { Player: '', Role: 'Batter', Nationality: 'India', 'IPL Ranking': 1, 'Base Price (₹ Crore)': 2 },
      { Player: 'Bad Role', Role: 'Pilot', Nationality: 'India', 'IPL Ranking': 2, 'Base Price (₹ Crore)': 2 },
      { Player: 'Frac Rank', Role: 'Batter', Nationality: 'India', 'IPL Ranking': 2.5, 'Base Price (₹ Crore)': 2 },
    ])
    const { rows } = parsePlayersFromBuffer(buf)
    expect(rows[0].errors).toContain('Name is required')
    expect(rows[1].errors.some((e) => e.includes('Unknown role'))).toBe(true)
    expect(rows[2].errors.some((e) => e.includes('whole number'))).toBe(true)
  })

  it('flags duplicate rankings and rankings beyond the player count', () => {
    const buf = makeWorkbook([
      { Player: 'Rohit', Role: 'Batter', Nationality: 'India', 'IPL Ranking': 1 },
      { Player: 'Rahul', Role: 'Batter', Nationality: 'India', 'IPL Ranking': 1 },
      { Player: 'Surya', Role: 'Batter', Nationality: 'India', 'IPL Ranking': 99 },
    ])
    const { rows } = parsePlayersFromBuffer(buf)
    const dupe = rows.find((r) => r.name === 'Rahul')!
    const range = rows.find((r) => r.name === 'Surya')!
    expect(dupe.errors.some((e) => e.includes('Duplicate IPL Ranking 1'))).toBe(true)
    expect(range.errors.some((e) => e.includes('out of range'))).toBe(true)
  })

  it('marks a missing required column', () => {
    const buf = makeWorkbook([{ Player: 'A', Role: 'Batter' }]) // no nationality / ranking
    expect(() => parsePlayersFromBuffer(buf)).toThrow(/Nationality/i)
  })

  it('confirmImport inserts valid players and skips duplicates already sold', async () => {
    // pre-existing sold player with same name
    const existing = await Player.create({
      name: 'Virat Kohli',
      role: 'Batsman',
      nationality: 'India',
      isOverseas: false,
      ranking: 99,
      basePrice: 2,
      status: 'Sold',
    })
    existing.soldPrice = 10
    existing.teamId = (await getTeamByShort('CSK'))!._id
    await existing.save()

    const buf = makeWorkbook([
      { Player: 'Virat Kohli', Role: 'Batter', Nationality: 'India', 'IPL Ranking': 1, 'Base Price (₹ Crore)': 2 },
      { Player: 'New Player', Role: 'Bowler', Nationality: 'Australia', 'IPL Ranking': 2, 'Base Price (₹ Crore)': 1 },
    ])
    const { rows } = parsePlayersFromBuffer(buf)
    const result = await confirmImport(rows)
    expect(result.inserted).toBe(1)
    expect(result.skippedDuplicates).toBe(1)
    const saved = await Player.findOne({ name: 'New Player' })
    expect(saved!.role).toBe('Bowler')
    expect(saved!.isOverseas).toBe(true)
    expect(saved!.basePrice).toBe(1) // rank 1-10 => 1.0 Cr tier
    // sold player untouched
    const untouched = await Player.findOne({ name: 'Virat Kohli' })
    expect(untouched!.soldPrice).toBe(10)
  })
})
