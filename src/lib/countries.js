// Liste volontairement limitée aux pays supportés dans l'UI (adresse + téléphone).
// Référence ISO 3166-1 alpha-2.

export const SUPPORTED_COUNTRIES = [
  { code: 'CH', name: 'Suisse', dialCode: '+41', flag: '🇨🇭' },
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷' },
  { code: 'IT', name: 'Italie', dialCode: '+39', flag: '🇮🇹' },
  { code: 'DE', name: 'Allemagne', dialCode: '+49', flag: '🇩🇪' },
  { code: 'BE', name: 'Belgique', dialCode: '+32', flag: '🇧🇪' },
  { code: 'LU', name: 'Luxembourg', dialCode: '+352', flag: '🇱🇺' },
]

export function getSupportedCountry(code) {
  const c = String(code || '').trim().toUpperCase()
  return SUPPORTED_COUNTRIES.find((x) => x.code === c) || null
}

export function normalizeCountryCode(code) {
  return (getSupportedCountry(code)?.code || 'CH').toUpperCase()
}
