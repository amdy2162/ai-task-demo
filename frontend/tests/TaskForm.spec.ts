import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TaskForm from '../src/components/TaskForm.vue'

describe('TaskForm', () => {
  it('validates required title and emits submit', async () => {
    const wrapper = mount(TaskForm)

    await wrapper.get('[data-test="title"]').setValue('   ')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.text()).toContain('Title is required.')
    expect(wrapper.emitted('create')).toBeUndefined()

    await wrapper.get('[data-test="title"]').setValue('Valid Title')
    await wrapper.get('[data-test="description"]').setValue('Valid Desc')
    await wrapper.get('form').trigger('submit')

    expect(wrapper.emitted('create')?.[0]).toEqual([{
      title: 'Valid Title',
      description: 'Valid Desc',
      status: 'Todo',
    }])
  })
})
