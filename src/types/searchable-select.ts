export interface SearchableSelectOption {
  id: string
  label: string
  disabled?: boolean
}

export interface SearchableSelectLoadContext {
  signal: AbortSignal
  requestId: number
}

export type SearchableSelectLoader = (
  query: string,
  context: SearchableSelectLoadContext,
) => Promise<SearchableSelectOption[]>

export interface SearchableSelectSelectPayload {
  option: SearchableSelectOption
}
