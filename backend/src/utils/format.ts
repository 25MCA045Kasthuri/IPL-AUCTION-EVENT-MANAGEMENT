// Display helpers for Indian currency formatting used across the app.
export const formatCrore = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `₹${value.toFixed(1)} Cr`
}
