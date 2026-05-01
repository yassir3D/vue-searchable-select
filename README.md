# Innercrowd SearchableSelect Assignment

Production-quality reusable `SearchableSelect` component built with Vue 3 + TypeScript + Vite.

## Run the project

```bash
npm install
npm run dev
```

Build and type-check:

```bash
npm run build
```

Run focused unit tests:

```bash
npm run test:run
```

## Implemented files

- `src/components/SearchableSelect.vue`
- `src/composables/useClickOutside.ts`
- `src/composables/useDebouncedAsyncOptions.ts`
- `src/types/searchable-select.ts`
- `src/data/countries.ts`
- `src/App.vue`
- `src/style.css`

## Component API

### Props

| Prop | Type | Default | Purpose |
| --- | --- | --- | --- |
| `modelValue` | `string \| null` | required | Selected option id (`v-model`) |
| `options` | `SearchableSelectOption[]` | `[]` | Synchronous options source |
| `loadOptions` | `SearchableSelectLoader` | `undefined` | Async options loader |
| `label` | `string` | `"Select an option"` | Input label |
| `placeholder` | `string` | `"Search..."` | Input placeholder |
| `disabled` | `boolean` | `false` | Disable whole control |
| `minQueryLength` | `number` | `0` | Minimum query length for async loading |
| `debounceMs` | `number` | `300` | Debounce delay for async loader |

### Emits

| Event | Payload | Purpose |
| --- | --- | --- |
| `update:modelValue` | `string \| null` | Standard `v-model` update |
| `select` | `{ option: SearchableSelectOption }` | Emits selected option object |

### Option and loader types

```ts
interface SearchableSelectOption {
  id: string
  label: string
  disabled?: boolean
}

type SearchableSelectLoader = (
  query: string,
  context: { signal: AbortSignal; requestId: number }
) => Promise<SearchableSelectOption[]>
```

## Sync usage

```vue
<SearchableSelect
  v-model="selectedCountry"
  label="Choose a country (sync)"
  :options="countryOptions"
/>
```

- Typing filters the local array.
- Click or Enter selects.
- ArrowUp/ArrowDown navigate.
- Escape and outside click close.

## Async usage

```vue
<SearchableSelect
  v-model="selectedCountry"
  label="Choose a country (async)"
  :load-options="loadCountriesAsync"
  :min-query-length="1"
  :debounce-ms="350"
/>
```

### Async behavior guarantees

- **Debounce**: loader calls are delayed by `debounceMs`.
- **Cancellation**: each new query aborts the previous in-flight request via `AbortController`.
- **Stale response protection**: each request has a monotonically increasing `requestId`; only the latest request may mutate state.
- **Abort is controlled**: `AbortError` is treated as normal cancellation, not user-facing failure.
- **States**: loading, empty, and error are explicitly rendered.

## Accessibility decisions

The component follows the combobox/listbox interaction model:

- Input uses `role="combobox"`.
- Input sets `aria-expanded`, `aria-controls`, and `aria-activedescendant` when an option is highlighted.
- Dropdown list uses `role="listbox"`.
- Each option uses `role="option"` and `aria-selected`.
- Disabled options are visibly disabled and cannot be selected with mouse or keyboard.

Keyboard behavior:

- `ArrowDown`: opens and moves highlight down.
- `ArrowUp`: opens and moves highlight up.
- `Enter`: selects highlighted option.
- `Escape`: closes dropdown.
- `Tab`: closes dropdown and keeps native focus movement.

## Architecture overview

- `SearchableSelect.vue`: reusable, typed component API and UI behavior.
- `useDebouncedAsyncOptions.ts`: debounced async orchestration, cancellation, stale-response guard.
- `useClickOutside.ts`: reusable outside-click logic with lifecycle cleanup.
- `searchable-select.ts`: shared type contracts.
- `countries.ts`: demo sync options and async loader with simulated latency and error case.

State ownership is kept local to the component and composables, with no global store.

## Concrete project context and constraints

### Stack constraints

- Framework/runtime: Vue 3 SFCs with `<script setup lang="ts">`
- Language/tooling: strict TypeScript, Vite, `vue-tsc`
- UI policy: no external UI component libraries
- State policy: no global stores for this assignment
- API policy: explicit typed props/emits, no `any`

### Accessibility requirements enforced

- Combobox/listbox semantics are implemented, not approximated:
  - input `role="combobox"` + `aria-expanded` + `aria-controls`
  - `aria-activedescendant` when an option is highlighted
  - list `role="listbox"`
  - item `role="option"` + `aria-selected`
- Disabled options are visible and non-selectable for both keyboard and mouse.
- Keyboard map is explicit and tested manually: ArrowUp/ArrowDown, Enter, Escape, Tab.

### Async patterns preferred

- Debounced async invocation (configurable delay).
- Abort previous in-flight request before starting next.
- Monotonic request-id guard to ignore stale responses.
- Treat `AbortError` as controlled cancellation.
- Keep loading/error/options explicit in state and UI.

### Things explicitly avoided

- Naive fetch-on-every-keystroke behavior.
- Allowing stale responses to overwrite newer results.
- Implicit/untyped component contracts.
- Over-generalized architecture (extra abstraction not needed for this scope).

## Tradeoffs

- This implementation keeps selection identity by `id` and stores a last selected option cache to maintain label display in async scenarios.
- It prioritizes assignment clarity over advanced features like virtualization, grouped options, and slot-based rendering.
- Async loader strategy is strict and safe (debounce + abort + request-id guard), at the cost of slightly more logic than a naive fetch-on-input approach.

## AI workflow evidence

Cursor was used with explicit mode shifts and rule-driven constraints:

- **Model**: Cursor Premium model selection
- **Plan mode**: used first to create and validate the implementation plan.
- **Agent mode**: used to implement the approved plan end-to-end (component, composables, docs, and tests).
- **Ask mode**: used to review async race conditions, accessibility, and keyboard edge cases before final fixes.

`.cursor/rules` constrained implementation decisions:

- `project-context.mdc`: enforced assignment scope, required capabilities, and anti-patterns (no UI lib/global store/untyped APIs).
- `vue-component-standards.mdc`: enforced `<script setup lang="ts">`, typed props/emits, and cleanup discipline.
- `async-search-rules.mdc`: enforced debounce, cancellation, request-id stale guard, and explicit async states.
- `accessibility-rules.mdc`: enforced combobox/listbox ARIA semantics and keyboard contract.
- `review-checklist.mdc`: enforced final validation criteria and README coverage.

`.cursorignore` excludes generated or low-signal files such as `node_modules`, `dist`, and coverage output so AI context stays focused on source, tests, docs, and workflow rules.

## AI decomposition and control strategy

This assignment was decomposed into deterministic, low-risk units so the tool could execute reliably:

1. Define shared type contracts (`src/types/searchable-select.ts`) first.
2. Implement reusable side-effect composables (`useClickOutside`, `useDebouncedAsyncOptions`) with cleanup guarantees.
3. Build component behavior on top of those composables.
4. Add demo wiring and styles only after behavior was stable.
5. Document guarantees and tradeoffs in README.
6. Run build/type-check and close with a manual requirement checklist.

### Where judgment constrained AI output

- **Async race safety over naive simplicity**: used both cancellation and request-id guarding; either one alone is often insufficient in real UIs.
- **Abort error handling**: prevented `AbortError` from being surfaced as user-facing failure state.
- **Disabled option handling**: blocked selection through both click and keyboard paths (easy for naive output to miss one path).
- **Focus semantics**: used `@mousedown.prevent` on options so click selection does not break combobox focus behavior.
- **Cleanup discipline**: ensured timers, event listeners, and abort controllers are disposed on unmount.

## Focused test coverage

Tests are intentionally focused on the highest-risk behavior, not snapshot-heavy coverage:

- sync options render on focus
- sync filtering by query
- click selection emit behavior
- Enter key selection of highlighted option
- Escape close behavior
- loading state for async loader
- error state for rejected async loader
- stale response protection (earlier slow response cannot overwrite newer result)

Test file: `src/components/SearchableSelect.test.ts`

## Manual QA checklist

Manually verified:

- typing filters sync options
- mouse click selects an option
- ArrowUp/ArrowDown move the highlighted option
- Enter selects highlighted option
- Escape closes the dropdown
- Tab closes while preserving native focus movement
- outside click closes the dropdown
- async loading state appears
- async error state appears
- slow earlier async response does not overwrite faster later response
