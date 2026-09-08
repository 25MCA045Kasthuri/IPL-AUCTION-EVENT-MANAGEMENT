import { asyncHandler } from '../middleware/asyncHandler.js'
import * as importService from '../services/importService.js'
import { AppError } from '../utils/errors.js'

// Phase 1: upload spreadsheet, parse + preview rows.
export const previewImport = asyncHandler(async (req, res) => {
  const file = req.file
  if (!file) throw new AppError('No file uploaded', 400)
  const { rows, usedColumns } = importService.parsePlayersFromBuffer(file.buffer)
  const valid = rows.filter((r) => r.errors.length === 0).length
  const invalid = rows.length - valid
  res.json({ success: true, data: { rows, usedColumns, total: rows.length, valid, invalid } })
})

// Phase 2: confirm import of the previously previewed rows.
export const confirmImport = asyncHandler(async (req, res) => {
  const rows = req.body.rows
  if (!Array.isArray(rows) || rows.length === 0) throw new AppError('No rows to import', 400)
  const result = await importService.confirmImport(rows)
  res.json({ success: true, data: result })
})

export const importTemplate = asyncHandler(async (_req, res) => {
  const template = [
    ['Player', 'Role', 'Nationality', 'IPL Ranking', 'Base Price (₹ Crore)'],
    ['Virat Kohli', 'Batter', 'India', 1, 1],
    ['Jasprit Bumrah', 'Bowler', 'India', 2, 0.8],
    ['Trent Boult', 'Bowler', 'New Zealand', 3, 0.8],
  ]
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(template)
  XLSX.utils.book_append_sheet(wb, ws, 'Player Stats')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', 'attachment; filename="player-import-template.xlsx"')
  res.send(buf)
})
