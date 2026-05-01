<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue'
import { useClickOutside } from '../composables/useClickOutside'
import { useDebouncedAsyncOptions } from '../composables/useDebouncedAsyncOptions'
import type {
  SearchableSelectLoader,
  SearchableSelectOption,
  SearchableSelectSelectPayload,
} from '../types/searchable-select'

interface SearchableSelectProps {
  modelValue: string | null
  options?: SearchableSelectOption[]
  loadOptions?: SearchableSelectLoader
  label?: string
  placeholder?: string
  disabled?: boolean
  minQueryLength?: number
  debounceMs?: number
}

const props = withDefaults(defineProps<SearchableSelectProps>(), {
  options: () => [],
  label: 'Select an option',
  placeholder: 'Search...',
  disabled: false,
  minQueryLength: 0,
  debounceMs: 300,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
  select: [payload: SearchableSelectSelectPayload]
}>()

const instanceId = `searchable-select-${Math.random().toString(36).slice(2, 10)}`
const inputId = `${instanceId}-input`
const listboxId = `${instanceId}-listbox`
const rootRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const query = ref('')
const highlightedIndex = ref(-1)
const selectedCache = ref<SearchableSelectOption | null>(null)

const isAsyncMode = computed(() => Boolean(props.loadOptions))

const asyncOptions = useDebouncedAsyncOptions(
  async (searchText, context) => {
    if (!props.loadOptions) {
      return []
    }
    return props.loadOptions(searchText, context)
  },
  toRef(props, 'debounceMs'),
)

const syncFilteredOptions = computed(() => {
  const loweredQuery = query.value.trim().toLowerCase()
  if (!loweredQuery) {
    return props.options
  }

  return props.options.filter((option) =>
    option.label.toLowerCase().includes(loweredQuery),
  )
})

const visibleOptions = computed<SearchableSelectOption[]>(() => {
  if (isAsyncMode.value) {
    return asyncOptions.options.value
  }
  return syncFilteredOptions.value
})

const belowMinQueryLength = computed(() => {
  if (!isAsyncMode.value) {
    return false
  }
  return query.value.trim().length < props.minQueryLength
})

const errorMessage = computed(() => asyncOptions.error.value)
const isLoading = computed(() => isAsyncMode.value && asyncOptions.isLoading.value)

const selectedOption = computed<SearchableSelectOption | null>(() => {
  if (!props.modelValue) {
    return null
  }

  const fromSync = props.options.find((option) => option.id === props.modelValue)
  if (fromSync) {
    return fromSync
  }

  const fromAsync = asyncOptions.options.value.find(
    (option) => option.id === props.modelValue,
  )
  if (fromAsync) {
    return fromAsync
  }

  if (selectedCache.value?.id === props.modelValue) {
    return selectedCache.value
  }

  return null
})

const activeDescendantId = computed(() => {
  if (!isOpen.value || highlightedIndex.value < 0) {
    return undefined
  }
  const option = visibleOptions.value[highlightedIndex.value]
  if (!option) {
    return undefined
  }
  return `${listboxId}-option-${option.id}`
})

const ensureHighlightIsValid = (): void => {
  const options = visibleOptions.value
  if (!options.length) {
    highlightedIndex.value = -1
    return
  }

  if (
    highlightedIndex.value >= options.length ||
    highlightedIndex.value < 0 ||
    options[highlightedIndex.value]?.disabled
  ) {
    highlightedIndex.value = options.findIndex((option) => !option.disabled)
  }
}

const triggerAsyncSearch = (): void => {
  if (!isAsyncMode.value) {
    return
  }

  if (belowMinQueryLength.value) {
    asyncOptions.reset()
    highlightedIndex.value = -1
    return
  }

  asyncOptions.run(query.value)
}

const openDropdown = (): void => {
  if (props.disabled) {
    return
  }
  isOpen.value = true
  triggerAsyncSearch()
}

const closeDropdown = (): void => {
  isOpen.value = false
  highlightedIndex.value = -1
}

const selectOption = (option: SearchableSelectOption): void => {
  if (option.disabled) {
    return
  }
  selectedCache.value = option
  query.value = option.label
  emit('update:modelValue', option.id)
  emit('select', { option })
  closeDropdown()
}

const moveHighlight = (step: 1 | -1): void => {
  const options = visibleOptions.value
  if (!options.length) {
    highlightedIndex.value = -1
    return
  }

  let currentIndex = highlightedIndex.value
  if (currentIndex === -1) {
    currentIndex = step > 0 ? -1 : 0
  }

  for (let loops = 0; loops < options.length; loops += 1) {
    currentIndex = (currentIndex + step + options.length) % options.length
    if (!options[currentIndex]?.disabled) {
      highlightedIndex.value = currentIndex
      return
    }
  }

  highlightedIndex.value = -1
}

const onInput = (event: Event): void => {
  const target = event.target as HTMLInputElement
  query.value = target.value
  openDropdown()
  highlightedIndex.value = -1
}

const onFocus = (): void => {
  openDropdown()
}

const onKeydown = (event: KeyboardEvent): void => {
  if (props.disabled) {
    return
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    openDropdown()
    moveHighlight(1)
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    openDropdown()
    moveHighlight(-1)
    return
  }

  if (event.key === 'Enter' && isOpen.value) {
    event.preventDefault()
    const option = visibleOptions.value[highlightedIndex.value]
    if (option) {
      selectOption(option)
    }
    return
  }

  if (event.key === 'Escape' && isOpen.value) {
    event.preventDefault()
    closeDropdown()
    return
  }

  if (event.key === 'Tab' && isOpen.value) {
    closeDropdown()
  }
}

watch(visibleOptions, () => {
  if (!isOpen.value) {
    return
  }
  ensureHighlightIsValid()
})

watch(
  () => props.modelValue,
  () => {
    if (isOpen.value) {
      return
    }
    query.value = selectedOption.value?.label ?? ''
  },
  { immediate: true },
)

useClickOutside(rootRef, () => closeDropdown(), isOpen)
</script>

<template>
  <div ref="rootRef" class="searchable-select">
    <label :for="inputId" class="searchable-select__label">{{ label }}</label>

    <input
      :id="inputId"
      class="searchable-select__input"
      type="text"
      :value="query"
      :placeholder="placeholder"
      :disabled="disabled"
      role="combobox"
      aria-autocomplete="list"
      :aria-expanded="isOpen"
      :aria-controls="listboxId"
      :aria-activedescendant="activeDescendantId"
      @focus="onFocus"
      @input="onInput"
      @keydown="onKeydown"
    />

    <div v-if="isOpen" class="searchable-select__dropdown">
      <div v-if="isLoading" class="searchable-select__status">Loading options...</div>

      <div v-else-if="errorMessage" class="searchable-select__status searchable-select__status--error">
        {{ errorMessage }}
      </div>

      <div v-else-if="belowMinQueryLength" class="searchable-select__status">
        Type at least {{ minQueryLength }} character<span v-if="minQueryLength !== 1">s</span>.
      </div>

      <ul
        v-else-if="visibleOptions.length > 0"
        :id="listboxId"
        class="searchable-select__options"
        role="listbox"
      >
        <li
          v-for="(option, index) in visibleOptions"
          :id="`${listboxId}-option-${option.id}`"
          :key="option.id"
          class="searchable-select__option"
          :class="{
            'searchable-select__option--highlighted': index === highlightedIndex,
            'searchable-select__option--disabled': option.disabled,
          }"
          role="option"
          :aria-selected="index === highlightedIndex"
          :aria-disabled="option.disabled"
          @mouseenter="!option.disabled ? (highlightedIndex = index) : undefined"
          @mousedown.prevent
          @click="selectOption(option)"
        >
          {{ option.label }}
        </li>
      </ul>

      <div v-else class="searchable-select__status">No options found.</div>
    </div>
  </div>
</template>

<style scoped>
.searchable-select {
  position: relative;
  display: grid;
  gap: 0.5rem;
}

.searchable-select__label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #1f2937;
}

.searchable-select__input {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  padding: 0.7rem 0.8rem;
  font-size: 1rem;
  background: #ffffff;
  color: #111827;
}

.searchable-select__input:focus-visible {
  outline: 3px solid #bfdbfe;
  border-color: #2563eb;
}

.searchable-select__dropdown {
  position: absolute;
  top: calc(100% + 0.35rem);
  left: 0;
  right: 0;
  z-index: 10;
  border: 1px solid #d1d5db;
  border-radius: 0.6rem;
  background: #ffffff;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
  overflow: hidden;
}

.searchable-select__options {
  max-height: 16rem;
  overflow-y: auto;
  list-style: none;
  margin: 0;
  padding: 0.35rem 0;
}

.searchable-select__option {
  padding: 0.65rem 0.8rem;
  cursor: pointer;
  color: #111827;
}

.searchable-select__option--highlighted {
  background: #eff6ff;
}

.searchable-select__option--disabled {
  color: #94a3b8;
  cursor: not-allowed;
}

.searchable-select__status {
  padding: 0.7rem 0.8rem;
  font-size: 0.95rem;
  color: #374151;
}

.searchable-select__status--error {
  color: #b91c1c;
}
</style>
