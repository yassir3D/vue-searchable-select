<script setup lang="ts">
import { computed, ref } from 'vue'
import SearchableSelect from './components/SearchableSelect.vue'
import { countryOptions, loadCountriesAsync } from './data/countries'

const syncSelection = ref<string | null>(null)
const asyncSelection = ref<string | null>(null)

const selectedSyncLabel = computed(() => {
  if (!syncSelection.value) {
    return 'None'
  }
  return countryOptions.find((option) => option.id === syncSelection.value)?.label ?? 'None'
})

const selectedAsyncLabel = computed(() => {
  if (!asyncSelection.value) {
    return 'None'
  }
  return countryOptions.find((option) => option.id === asyncSelection.value)?.label ?? 'None'
})
</script>

<template>
  <main class="page">
    <header class="page__header">
      <h1>Searchable Select Assignment Demo</h1>
      <p>
        This page demonstrates sync and async option loading, keyboard navigation, and
        resilient async behavior.
      </p>
    </header>

    <section class="demo-grid">
      <article class="panel">
        <h2>Sync options</h2>
        <SearchableSelect
          v-model="syncSelection"
          label="Choose a country (sync)"
          placeholder="Type to filter countries..."
          :options="countryOptions"
        />
        <p class="panel__meta">
          Selected id: <strong>{{ syncSelection ?? 'None' }}</strong>
        </p>
        <p class="panel__meta">
          Selected label: <strong>{{ selectedSyncLabel }}</strong>
        </p>
      </article>

      <article class="panel">
        <h2>Async options</h2>
        <SearchableSelect
          v-model="asyncSelection"
          label="Choose a country (async)"
          placeholder="Search countries (type &quot;error&quot; to test failure)..."
          :load-options="loadCountriesAsync"
          :min-query-length="1"
          :debounce-ms="350"
        />
        <p class="panel__meta">
          Selected id: <strong>{{ asyncSelection ?? 'None' }}</strong>
        </p>
        <p class="panel__meta">
          Selected label: <strong>{{ selectedAsyncLabel }}</strong>
        </p>
      </article>
    </section>
  </main>
</template>
