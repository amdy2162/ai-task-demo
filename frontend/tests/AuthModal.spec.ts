import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AuthModal from '../src/components/AuthModal.vue'
import { useAuthStore } from '../src/stores/authStore'

const mockLogin = vi.fn()
const mockRegister = vi.fn()

vi.mock('../src/stores/authStore', () => {
  return {
    useAuthStore: () => ({
      login: mockLogin,
      register: mockRegister,
      token: '',
      user: null,
    }),
  }
})

describe('AuthModal.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockLogin.mockReset().mockResolvedValue(undefined)
    mockRegister.mockReset().mockResolvedValue(undefined)
  })

  it('renders modal only when isOpen is true', () => {
    const wrapperClosed = mount(AuthModal, {
      props: { isOpen: false },
    })
    expect(wrapperClosed.find('.modal-overlay').classes()).not.toContain('open')

    const wrapperOpen = mount(AuthModal, {
      props: { isOpen: true },
    })
    expect(wrapperOpen.find('.modal-overlay').classes()).toContain('open')
  })

  it('switches between Login and Register tabs', async () => {
    const wrapper = mount(AuthModal, {
      props: { isOpen: true },
    })

    expect(wrapper.find('#modal-title').text()).toBe('Welcome Back')
    expect(wrapper.find('[data-test="submit"]').text()).toContain('Login')

    // Switch to Register tab
    await wrapper.find('[data-test="tab-register"]').trigger('click')

    expect(wrapper.find('#modal-title').text()).toBe('Create Account')
    expect(wrapper.find('[data-test="submit"]').text()).toContain('Sign Up')

    // Switch back to Login tab
    await wrapper.find('[data-test="tab-login"]').trigger('click')

    expect(wrapper.find('#modal-title').text()).toBe('Welcome Back')
    expect(wrapper.find('[data-test="submit"]').text()).toContain('Login')
  })

  it('validates username (min 3 chars) and password (min 6 chars)', async () => {
    const wrapper = mount(AuthModal, {
      props: { isOpen: true },
    })

    // 1. Submit empty fields
    await wrapper.find('form').trigger('submit')
    expect(wrapper.find('[data-test="error"]').text()).toContain('Username must be at least 3 characters.')
    expect(mockLogin).not.toHaveBeenCalled()

    // 2. Submit username too short
    await wrapper.find('[data-test="username"]').setValue('ab')
    await wrapper.find('[data-test="password"]').setValue('123456')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.find('[data-test="error"]').text()).toContain('Username must be at least 3 characters.')
    expect(mockLogin).not.toHaveBeenCalled()

    // 3. Submit password too short
    await wrapper.find('[data-test="username"]').setValue('abc')
    await wrapper.find('[data-test="password"]').setValue('12345')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.find('[data-test="error"]').text()).toContain('Password must be at least 6 characters.')
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('submits login request and emits success & close events on success', async () => {
    const wrapper = mount(AuthModal, {
      props: { isOpen: true },
    })

    await wrapper.find('[data-test="username"]').setValue('correctuser')
    await wrapper.find('[data-test="password"]').setValue('correctpass')
    await wrapper.find('form').trigger('submit')

    expect(mockLogin).toHaveBeenCalledWith('correctuser', 'correctpass')
    
    // Wait for async request mock to resolve
    await vi.waitFor(() => {
      expect(wrapper.emitted('success')).toBeTruthy()
      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  it('submits register request and emits success & close events on success', async () => {
    const wrapper = mount(AuthModal, {
      props: { isOpen: true },
    })

    // Switch to Register
    await wrapper.find('[data-test="tab-register"]').trigger('click')

    await wrapper.find('[data-test="username"]').setValue('newuser')
    await wrapper.find('[data-test="password"]').setValue('newpassword')
    await wrapper.find('form').trigger('submit')

    expect(mockRegister).toHaveBeenCalledWith('newuser', 'newpassword')
    
    // Wait for async request mock to resolve
    await vi.waitFor(() => {
      expect(wrapper.emitted('success')).toBeTruthy()
      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  it('displays API error message on submit failure', async () => {
    const wrapper = mount(AuthModal, {
      props: { isOpen: true },
    })

    mockLogin.mockRejectedValue({
      response: {
        data: {
          message: 'Invalid credentials.',
        },
      },
    })

    await wrapper.find('[data-test="username"]').setValue('wronguser')
    await wrapper.find('[data-test="password"]').setValue('wrongpass')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() => {
      expect(wrapper.find('[data-test="error"]').text()).toBe('Invalid credentials.')
    })
  })

  it('emits close event when close button or background overlay is clicked', async () => {
    const wrapper = mount(AuthModal, {
      props: { isOpen: true },
    })

    // Click close button
    await wrapper.find('[data-test="close"]').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()

    // Click overlay background
    await wrapper.find('[data-test="auth-modal-overlay"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(2)
  })
})
