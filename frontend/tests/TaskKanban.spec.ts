import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TaskKanban from '../src/components/TaskKanban.vue'
import type { TaskItem } from '../src/types/task'

describe('TaskKanban', () => {
  const tasks: TaskItem[] = [
    { id: 1, title: 'Task 1', description: '', status: 'Todo', createdAt: '2026-08-10T00:00:00Z' },
    { id: 2, title: 'Task 2', description: '', status: 'Doing', createdAt: '2026-08-10T00:00:00Z' },
    { id: 3, title: 'Task 3', description: '', status: 'Done', createdAt: '2026-08-10T00:00:00Z' },
  ]

  it('groups tasks into Todo, Doing, Done columns', () => {
    const wrapper = mount(TaskKanban, { props: { tasks } })
    expect(wrapper.get('[data-test="column-todo"]').text()).toContain('Task 1')
    expect(wrapper.get('[data-test="column-doing"]').text()).toContain('Task 2')
    expect(wrapper.get('[data-test="column-done"]').text()).toContain('Task 3')
  })
})
