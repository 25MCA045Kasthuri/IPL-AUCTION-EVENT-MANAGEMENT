import { useState } from 'react'
import { api, uploadForm, ApiError, API_BASE } from '../services/api'
import type { ImportRow } from '../types'

export default function ImportWizard({ onImported }: { onImported: (msg: string) => void }) {
  const [rows, setRows] = useState<ImportRow[] | null>(null)
  const [usedColumns, setUsedColumns] = useState<string[]>([])
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const handleFile = async (file: File) => {
    setError(null)
    setFileName('')
    setRows(null)
    const form = new FormData()
    form.append('file', file)
    setBusy(true)
    try {
      const res = await uploadForm<{ data: { rows: ImportRow[]; usedColumns: string[] } }>('/import/preview', form)
      setRows(res.data.rows)
      setUsedColumns(res.data.usedColumns)
      setFileName(file.name)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  const confirm = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await api.post<{ data: { inserted: number; updated: number; skippedDuplicates: number; invalidCount: number } }>(
        '/import/confirm',
        { rows },
      )
      onImported(
        `Import complete: ${res.data.inserted} inserted, ${res.data.updated} updated, ${res.data.skippedDuplicates} duplicate-skipped, ${res.data.invalidCount} invalid skipped.`,
      )
      setRows(null)
      setFileName('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Confirm failed')
    } finally {
      setBusy(false)
    }
  }

  const validCount = rows ? rows.filter((r) => r.errors.length === 0).length : 0
  const invalidRows = rows ? rows.filter((r) => r.errors.length > 0) : []

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h3 className="mb-3 text-lg font-bold">Excel Player Import</h3>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="block w-full max-w-sm text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-yellow-400 file:px-3 file:py-2 file:font-semibold file:text-slate-900 hover:file:bg-yellow-300"
        />
        <a
          href={`${API_BASE}/import/template`}
          className="text-sm font-semibold text-yellow-400 underline underline-offset-2"
          target="_blank"
          rel="noreferrer"
        >
          Download template
        </a>
      </div>

      {busy && !rows && <p className="mt-3 text-sm text-slate-400">Reading spreadsheet...</p>}
      {error && (
        <div className="mt-3 rounded-lg border border-red-700 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {rows && (
        <div className="mt-4">
          <div className="mb-2 flex flex-wrap items-center gap-4 text-sm">
            <span className="font-semibold text-white">File: {fileName}</span>
            <span className="text-slate-400">Columns detected: {usedColumns.join(', ')}</span>
            <span className="text-emerald-400">Valid: {validCount}</span>
            <span className="text-red-400">Invalid: {rows.length - validCount}</span>
          </div>

          <div className="max-h-64 overflow-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-800 text-slate-300">
                <tr>
                  <th className="px-2 py-1.5">#</th>
                  <th className="px-2 py-1.5">Player</th>
                  <th className="px-2 py-1.5">Role</th>
                  <th className="px-2 py-1.5">Nationality</th>
                  <th className="px-2 py-1.5">Ranking</th>
                  <th className="px-2 py-1.5">Base Price</th>
                  <th className="px-2 py-1.5">Validation</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.rowNumber} className="border-t border-slate-800">
                    <td className="px-2 py-1">{r.rowNumber}</td>
                    <td className="px-2 py-1">{r.name || '—'}</td>
                    <td className="px-2 py-1">{r.role || r.rawRole}</td>
                    <td className="px-2 py-1">{r.nationality || '—'}</td>
                    <td className="px-2 py-1">{r.ranking}</td>
                    <td className="px-2 py-1">₹{r.basePrice} Cr</td>
                    <td className="px-2 py-1">
                      {r.errors.length === 0 ? (
                        <span className="text-emerald-400">OK</span>
                      ) : (
                        <span className="text-red-400">{r.errors.join('; ')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {invalidRows.length > 0 && (
            <div className="mt-3 rounded-lg border border-amber-700 bg-amber-950/30 px-3 py-2 text-sm text-amber-300">
              {invalidRows.length} row(s) have validation errors and will be <strong>skipped</strong>.
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={confirm}
              disabled={busy || validCount === 0}
              className="rounded-lg bg-green-600 px-5 py-2 font-bold text-white hover:bg-green-500 disabled:opacity-50"
            >
              {busy ? 'Importing...' : `Confirm Import (${validCount} valid)`}
            </button>
            <button
              onClick={() => {
                setRows(null)
                setFileName('')
              }}
              className="rounded-lg border border-slate-700 px-5 py-2 font-semibold hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
