function toStr(v) {
  return String(v || '').trim()
}

export const PHONE_DIAL_CODES = [
  { country: 'CH', dialCode: '+41', label: 'CH +41' },
  { country: 'FR', dialCode: '+33', label: 'FR +33' },
  { country: 'DE', dialCode: '+49', label: 'DE +49' },
  { country: 'IT', dialCode: '+39', label: 'IT +39' },
  { country: 'AT', dialCode: '+43', label: 'AT +43' },
]

export function parsePhoneParts(phoneValue) {
  const raw = toStr(phoneValue)
  const m = raw.match(/^(\+\d{1,4})\s*(.*)$/)
  if (!m) {
    return { dialCode: '+41', national: raw }
  }
  return { dialCode: m[1], national: toStr(m[2]) }
}

export function composePhone({ dialCode, national }) {
  const d = toStr(dialCode) || '+41'
  const n = toStr(national)
  return n ? `${d} ${n}` : d
}

export function looksLikePhone(value) {
  const digits = String(value || '').replace(/\D/g, '')
  return digits.length >= 8
}
