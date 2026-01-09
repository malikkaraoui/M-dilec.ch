import { PHONE_DIAL_CODES } from '../lib/phone.js'

function toStr(v) {
  return String(v || '').trim()
}

export function PhoneInput({
  dialCode,
  national,
  onChange,
  label = 'Téléphone',
  idPrefix = 'phone',
  placeholder = '79 123 45 67',
}) {
  const dc = toStr(dialCode) || '+41'
  const nat = toStr(national)

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium" htmlFor={`${idPrefix}-national`}>
        {label}
      </label>
      <div className="flex gap-2">
        <select
          className="w-28 rounded-lg border border-neutral-200 bg-white px-2 py-2 text-sm outline-none focus:border-neutral-300 focus:ring-2"
          style={{ '--tw-ring-color': 'rgba(213, 43, 30, 0.18)' }}
          value={dc}
          onChange={(e) => onChange?.({ dialCode: e.target.value, national: nat })}
          aria-label="Indicatif pays"
        >
          {PHONE_DIAL_CODES.map((x) => (
            <option key={x.dialCode} value={x.dialCode}>
              {x.label}
            </option>
          ))}
          <option value={dc}>Autre</option>
        </select>

        <input
          id={`${idPrefix}-national`}
          className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-300 focus:ring-2"
          style={{ '--tw-ring-color': 'rgba(213, 43, 30, 0.18)' }}
          value={nat}
          onChange={(e) => onChange?.({ dialCode: dc, national: e.target.value })}
          type="tel"
          placeholder={placeholder}
          autoComplete="tel"
        />
      </div>
      <div className="text-xs text-neutral-500">Format: {dc} …</div>
    </div>
  )
}
