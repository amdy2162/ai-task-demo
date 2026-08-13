import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import TaskFilter from '../src/components/TaskFilter.vue'

describe('TaskFilter', () => {
  const defaultProps = {
    selectedStatus: 'All' as const,
    viewMode: 'list' as const,
    searchQuery: '',
    sortBy: 'createdAt',
    sortOrder: 'desc' as const,
  }

  it('renders active filter and emits filterChange', async () => {
    const wrapper = mount(TaskFilter, { props: defaultProps })
    await wrapper.get('[data-test="filter"]').setValue('Todo')
    expect(wrapper.emitted('filterChange')?.[0]).toEqual(['Todo'])
  })

  it('emits viewModeChange when view toggle is clicked', async () => {
    const wrapper = mount(TaskFilter, { props: defaultProps })
    await wrapper.get('[data-test="view-kanban"]').trigger('click')
    expect(wrapper.emitted('viewModeChange')?.[0]).toEqual(['kanban'])
  })

  it('emits searchChange after debounce delay', async () => {
    vi.useFakeTimers()
    const wrapper = mount(TaskFilter, { props: defaultProps })
    
    await wrapper.get('[data-test="search-input"]').setValue('Hello')
    expect(wrapper.emitted('searchChange')).toBeUndefined()

    // Fast-forward debounce timer
    vi.advanceTimersByTime(300)
    expect(wrapper.emitted('searchChange')?.[0]).toEqual(['Hello'])
    vi.useRealTimers()
  })

  it('emits sortChange when sorting criterion changes', async () => {
    const wrapper = mount(TaskFilter, { props: defaultProps })
    await wrapper.get('[data-test="sort-by"]').setValue('title')
    expect(wrapper.emitted('sortChange')?.[0]).toEqual(['title', 'desc'])
  })

  it('emits sortChange with toggled order when order button clicked', async () => {
    const wrapper = mount(TaskFilter, { props: defaultProps })
    await wrapper.get('[data-test="toggle-sort-order"]').trigger('click')
    expect(wrapper.emitted('sortChange')?.[0]).toEqual(['createdAt', 'asc'])
  })
})
