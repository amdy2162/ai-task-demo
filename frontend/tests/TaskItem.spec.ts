import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TaskItem from '../src/components/TaskItem.vue'
import type { TaskItem as TaskItemType } from '../src/types/task'

describe('TaskItem', () => {
  const sample: TaskItemType = {
    id: 1,
    title: 'Test Title',
    description: 'Test Description',
    status: 'Todo',
    createdAt: '2026-08-10T00:00:00Z',
  }

  it('renders task fields correctly', () => {
    const wrapper = mount(TaskItem, { props: { task: sample } })
    expect(wrapper.text()).toContain('Test Title')
    expect(wrapper.text()).toContain('Test Description')
    expect(wrapper.get('[data-test="created-at-1"]').text()).not.toBe('')
  })

  it('emits statusChange when selector changes', async () => {
    const wrapper = mount(TaskItem, { props: { task: sample } })
    await wrapper.get('[data-test="task-status-1"]').setValue('Doing')
    expect(wrapper.emitted('statusChange')?.[0]).toEqual([1, 'Doing'])
  })

  it('emits delete when delete button is clicked', async () => {
    const wrapper = mount(TaskItem, { props: { task: sample } })
    await wrapper.get('[data-test="delete-task-1"]').trigger('click')
    expect(wrapper.emitted('delete')?.[0]).toEqual([1])
  })

  it('toggles edit mode and emits edit event on save', async () => {
    const wrapper = mount(TaskItem, { props: { task: sample } })
    
    // Toggle edit mode
    await wrapper.get('[data-test="edit-task-btn-1"]').trigger('click')
    expect(wrapper.find('[data-test="edit-title"]').exists()).toBe(true)

    // Edit content
    await wrapper.get('[data-test="edit-title"]').setValue('Updated Title')
    await wrapper.get('[data-test="edit-description"]').setValue('Updated Desc')
    await wrapper.get('[data-test="save-edit"]').trigger('click')

    expect(wrapper.emitted('edit')?.[0]).toEqual([1, 'Updated Title', 'Updated Desc'])
    expect(wrapper.find('[data-test="edit-title"]').exists()).toBe(false)
  })
})
