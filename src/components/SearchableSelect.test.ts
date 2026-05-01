// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import SearchableSelect from './SearchableSelect.vue'
import type {
  SearchableSelectLoader,
  SearchableSelectOption,
} from '../types/searchable-select'

const syncOptions: SearchableSelectOption[] = [
  { id: 'nl', label: 'Netherlands' },
  { id: 'be', label: 'Belgium' },
  { id: 'de', label: 'Germany' },
]

const flushMicrotasks = async (): Promise<void> => {
  await Promise.resolve()
  await Promise.resolve()
}

const sleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

const createDeferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('SearchableSelect', () => {
  it('renders sync options after focus', async () => {
    const wrapper = mount(SearchableSelect, {
      props: {
        modelValue: null,
        options: syncOptions,
      },
    })

    await wrapper.get('input[role="combobox"]').trigger('focus')

    expect(wrapper.find('[role="listbox"]').exists()).toBe(true)
    expect(wrapper.findAll('[role="option"]')).toHaveLength(3)
  })

  it('filters sync options by typed query', async () => {
    const wrapper = mount(SearchableSelect, {
      props: {
        modelValue: null,
        options: syncOptions,
      },
    })

    const input = wrapper.get('input[role="combobox"]')
    await input.trigger('focus')
    await input.setValue('ger')

    const options = wrapper.findAll('[role="option"]')
    expect(options).toHaveLength(1)
    expect(options[0]?.text()).toBe('Germany')
  })

  it('selects option by click', async () => {
    const wrapper = mount(SearchableSelect, {
      props: {
        modelValue: null,
        options: syncOptions,
      },
    })

    await wrapper.get('input[role="combobox"]').trigger('focus')
    await wrapper.findAll('[role="option"]')[1]?.trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['be'])
    expect(wrapper.emitted('select')?.[0]?.[0]).toEqual({
      option: syncOptions[1],
    })
  })

  it('selects highlighted option with Enter', async () => {
    const wrapper = mount(SearchableSelect, {
      props: {
        modelValue: null,
        options: syncOptions,
      },
    })

    const input = wrapper.get('input[role="combobox"]')
    await input.trigger('focus')
    await input.trigger('keydown', { key: 'ArrowDown' })
    await input.trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['nl'])
  })

  it('closes with Escape', async () => {
    const wrapper = mount(SearchableSelect, {
      props: {
        modelValue: null,
        options: syncOptions,
      },
    })

    const input = wrapper.get('input[role="combobox"]')
    await input.trigger('focus')
    expect(wrapper.find('[role="listbox"]').exists()).toBe(true)

    await input.trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false)
  })

  it('closes by clicking outside', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const wrapper = mount(SearchableSelect, {
      attachTo: host,
      props: {
        modelValue: null,
        options: syncOptions,
      },
    })

    await wrapper.get('input[role="combobox"]').trigger('focus')
    expect(wrapper.find('[role="listbox"]').exists()).toBe(true)

    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    await flushMicrotasks()

    expect(wrapper.find('[role="listbox"]').exists()).toBe(false)
    wrapper.unmount()
    host.remove()
  })

  it('shows loading state for async loader', async () => {
    vi.useFakeTimers()

    const deferred = createDeferred<SearchableSelectOption[]>()
    const loader: SearchableSelectLoader = vi.fn(async () => deferred.promise)

    const wrapper = mount(SearchableSelect, {
      props: {
        modelValue: null,
        loadOptions: loader,
        debounceMs: 25,
        minQueryLength: 1,
      },
    })

    await wrapper.get('input[role="combobox"]').setValue('ne')
    await vi.advanceTimersByTimeAsync(26)
    await flushMicrotasks()

    expect(wrapper.text()).toContain('Loading options...')

    deferred.resolve([{ id: 'nl', label: 'Netherlands' }])
    await flushMicrotasks()
    vi.useRealTimers()
  })

  it('shows error state when async loader rejects', async () => {
    vi.useFakeTimers()

    const loader: SearchableSelectLoader = vi.fn(async () => {
      throw new Error('Request failed')
    })

    const wrapper = mount(SearchableSelect, {
      props: {
        modelValue: null,
        loadOptions: loader,
        debounceMs: 25,
        minQueryLength: 1,
      },
    })

    await wrapper.get('input[role="combobox"]').setValue('ne')
    await vi.advanceTimersByTimeAsync(26)
    await flushMicrotasks()

    expect(wrapper.text()).toContain('Request failed')
    vi.useRealTimers()
  })

  it('ignores stale async response from an earlier query', async () => {
    const first = createDeferred<SearchableSelectOption[]>()
    const second = createDeferred<SearchableSelectOption[]>()

    const loaderQueue = [first.promise, second.promise]
    const loader: SearchableSelectLoader = vi.fn(async () => loaderQueue.shift() ?? [])

    const wrapper = mount(SearchableSelect, {
      props: {
        modelValue: null,
        loadOptions: loader,
        debounceMs: 1,
        minQueryLength: 1,
      },
    })

    const input = wrapper.get('input[role="combobox"]')
    await input.setValue('a')
    await sleep(10)

    await input.setValue('ab')
    await sleep(10)
    expect(loader).toHaveBeenCalledTimes(2)

    second.resolve([{ id: 'new', label: 'New Result' }])
    await flushMicrotasks()
    await nextTick()
    expect(wrapper.text()).toContain('New Result')

    first.resolve([{ id: 'old', label: 'Old Result' }])
    await flushMicrotasks()
    await nextTick()

    expect(wrapper.text()).toContain('New Result')
    expect(wrapper.text()).not.toContain('Old Result')
  })
})
