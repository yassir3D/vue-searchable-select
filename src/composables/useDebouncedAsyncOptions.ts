import { onUnmounted, ref, type Ref } from 'vue'
import type {
  SearchableSelectLoader,
  SearchableSelectOption,
} from '../types/searchable-select'

interface UseDebouncedAsyncOptionsResult {
  options: Ref<SearchableSelectOption[]>
  isLoading: Ref<boolean>
  error: Ref<string | null>
  run: (query: string) => void
  cancel: () => void
  reset: () => void
}

export function useDebouncedAsyncOptions(
  loadOptions: SearchableSelectLoader,
  debounceMs: Ref<number>,
): UseDebouncedAsyncOptionsResult {
  const options = ref<SearchableSelectOption[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const controller = ref<AbortController | null>(null)
  let timer: ReturnType<typeof setTimeout> | null = null
  let latestRequestId = 0

  const clearTimer = (): void => {
    if (!timer) {
      return
    }
    clearTimeout(timer)
    timer = null
  }

  const cancel = (): void => {
    clearTimer()
    controller.value?.abort()
    controller.value = null
    isLoading.value = false
  }

  const reset = (): void => {
    cancel()
    options.value = []
    error.value = null
  }

  const execute = async (query: string): Promise<void> => {
    controller.value?.abort()
    const nextController = new AbortController()
    controller.value = nextController
    const requestId = ++latestRequestId

    isLoading.value = true
    error.value = null

    try {
      const nextOptions = await loadOptions(query, {
        signal: nextController.signal,
        requestId,
      })

      if (requestId !== latestRequestId) {
        return
      }

      options.value = nextOptions
    } catch (caughtError: unknown) {
      if (requestId !== latestRequestId) {
        return
      }

      if (caughtError instanceof DOMException && caughtError.name === 'AbortError') {
        return
      }

      error.value =
        caughtError instanceof Error ? caughtError.message : 'Failed to load options.'
      options.value = []
    } finally {
      if (requestId === latestRequestId) {
        isLoading.value = false
      }

      if (controller.value === nextController) {
        controller.value = null
      }
    }
  }

  const run = (query: string): void => {
    clearTimer()
    timer = setTimeout(() => {
      timer = null
      void execute(query)
    }, debounceMs.value)
  }

  onUnmounted(() => {
    cancel()
  })

  return {
    options,
    isLoading,
    error,
    run,
    cancel,
    reset,
  }
}
