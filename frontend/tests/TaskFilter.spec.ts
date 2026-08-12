import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TaskFilter from '../src/components/TaskFilter.vue'

describe('TaskFilter', () => {
  it('renders active filter and emits filterChange', async () => {
    const wrapper = mount(TaskFilter, {
      props: { selectedStatus: 'All', viewMode: 'list' },
    })
    await wrapper.get('[data-test="filter"]').setValue('Todo')
    expect(wrapper.emitted('filterChange')?.[0]).toEqual(['Todo'])
  })

  it('emits viewModeChange when view toggle is clicked', async () => {
    const wrapper = mount(TaskFilter, {
      props: { selectedStatus: 'All', viewMode: 'list' },
    })
    await wrapper.get('[data-test="view-kanban"]').trigger('click')
    expect(wrapper.emitted('viewModeChange')?.[0]).toEqual(['kanban'])
  })
})
