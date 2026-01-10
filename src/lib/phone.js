import { SUPPORTED_COUNTRIES } from './countries.js'

function toStr(v) {
  return String(v || '').trim()
}

export const PHONE_DIAL_CODES = SUPPORTED_COUNTRIES.map((c) => ({
  country: c.code,
  dialCode: c.dialCode,
  label: `${c.flag} ${c.code} ${c.dialCode}`,
}))

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

export function dialCodeForCountry(countryCode) {
  const cc = String(countryCode || '').trim().toUpperCase()
  const found = SUPPORTED_COUNTRIES.find((c) => c.code === cc)
  return found?.dialCode || '+41'
}
