function toStr(v) {
  return String(v || '').trim()
}

export function normalizeShippingAddress(value) {
  const a = value && typeof value === 'object' ? value : {}
  return {
    name: toStr(a.name),
    street: toStr(a.street),
    streetNo: toStr(a.streetNo),
    postalCode: toStr(a.postalCode),
    city: toStr(a.city),
    country: toStr(a.country) || 'CH',
  }
}

export function isShippingAddressComplete(addr) {
  const a = normalizeShippingAddress(addr)
  return Boolean(a.name && a.street && a.streetNo && a.postalCode && a.city && a.country)
}
