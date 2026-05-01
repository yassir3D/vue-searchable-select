import type {
  SearchableSelectLoader,
  SearchableSelectOption,
} from '../types/searchable-select'

export const countryOptions: SearchableSelectOption[] = [
  { id: 'nl', label: 'Netherlands' },
  { id: 'be', label: 'Belgium' },
  { id: 'de', label: 'Germany' },
  { id: 'fr', label: 'France' },
  { id: 'es', label: 'Spain' },
  { id: 'pt', label: 'Portugal' },
  { id: 'it', label: 'Italy' },
  { id: 'gb', label: 'United Kingdom' },
  { id: 'ie', label: 'Ireland' },
  { id: 'se', label: 'Sweden' },
  { id: 'no', label: 'Norway' },
  { id: 'dk', label: 'Denmark' },
  { id: 'fi', label: 'Finland' },
  { id: 'ch', label: 'Switzerland' },
  { id: 'at', label: 'Austria' },
  { id: 'pl', label: 'Poland' },
  { id: 'cz', label: 'Czech Republic' },
  { id: 'is', label: 'Iceland', disabled: true },
]

const waitWithAbort = (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)

    const onAbort = (): void => {
      clearTimeout(timeoutId)
      reject(new DOMException('Request aborted', 'AbortError'))
    }

    if (signal.aborted) {
      onAbort()
      return
    }

    signal.addEventListener('abort', onAbort, { once: true })
  })

export const loadCountriesAsync: SearchableSelectLoader = async (query, context) => {
  const normalizedQuery = query.trim().toLowerCase()

  // Simulated network jitter helps verify stale-response protection.
  const jitterMs = 250 + ((context.requestId % 3) * 180)
  await waitWithAbort(jitterMs, context.signal)

  if (normalizedQuery === 'error') {
    throw new Error('Simulated API failure. Try another search.')
  }

  if (!normalizedQuery) {
    return countryOptions.slice(0, 8)
  }

  return countryOptions.filter((option) =>
    option.label.toLowerCase().includes(normalizedQuery),
  )
}
