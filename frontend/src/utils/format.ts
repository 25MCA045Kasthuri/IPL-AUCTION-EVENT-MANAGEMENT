export const formatCrore = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `₹${value.toFixed(1)} Cr`
}

export const formatPrice = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  if (value < 1) {
    return `₹${Math.round(value * 100)} Lakh`
  }
  return `₹${value.toFixed(1)} Cr`
}

export const formatBlock = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `₹${value.toFixed(1)} Cr`
}
