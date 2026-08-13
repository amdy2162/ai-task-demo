<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAuthStore } from '../stores/authStore'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'success'): void
}>()

const authStore = useAuthStore()

const activeTab = ref<'login' | 'register'>('login')
const username = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMessage = ref('')

// Reset form when modal opens/closes or when tab changes
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    resetForm()
  }
})

watch(activeTab, () => {
  resetForm()
})

function resetForm(): void {
  username.value = ''
  password.value = ''
  errorMessage.value = ''
}

async function handleSubmit(): Promise<void> {
  errorMessage.value = ''
  const name = username.value.trim()
  const pass = password.value

  if (name.length < 3) {
    errorMessage.value = 'Username must be at least 3 characters.'
    return
  }

  if (pass.length < 6) {
    errorMessage.value = 'Password must be at least 6 characters.'
    return
  }

  isLoading.value = true
  try {
    if (activeTab.value === 'login') {
      await authStore.login(name, pass)
    } else {
      await authStore.register(name, pass)
    }
    emit('success')
    emit('close')
  } catch (err: any) {
    errorMessage.value = err.response?.data?.message || err.message || 'Authentication failed.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div
    class="modal-overlay"
    :class="{ open: isOpen }"
    data-test="auth-modal-overlay"
    @click.self="emit('close')"
  >
    <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-header">
        <h2 id="modal-title">{{ activeTab === 'login' ? 'Welcome Back' : 'Create Account' }}</h2>
        <button
          type="button"
          class="close-btn"
          data-test="close"
          aria-label="Close modal"
          @click="emit('close')"
        >
          &times;
        </button>
      </div>

      <div class="modal-tabs">
        <button
          type="button"
          class="tab-btn"
          :class="{ active: activeTab === 'login' }"
          data-test="tab-login"
          @click="activeTab = 'login'"
        >
          Login
        </button>
        <button
          type="button"
          class="tab-btn"
          :class="{ active: activeTab === 'register' }"
          data-test="tab-register"
          @click="activeTab = 'register'"
        >
          Register
        </button>
      </div>

      <form class="modal-form" @submit.prevent="handleSubmit">
        <label class="form-label">
          <span>Username</span>
          <input
            v-model="username"
            type="text"
            data-test="username"
            placeholder="Min 3 characters"
            required
            :disabled="isLoading"
          />
        </label>

        <label class="form-label">
          <span>Password</span>
          <input
            v-model="password"
            type="password"
            data-test="password"
            placeholder="Min 6 characters"
            required
            :disabled="isLoading"
          />
        </label>

        <p v-if="errorMessage" class="error" data-test="error" role="alert">
          {{ errorMessage }}
        </p>

        <button
          type="submit"
          class="submit-btn"
          data-test="submit"
          :disabled="isLoading"
        >
          <span v-if="isLoading" class="spinner"></span>
          <span>{{ activeTab === 'login' ? 'Login' : 'Sign Up' }}</span>
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.modal-overlay.open {
  opacity: 1;
  pointer-events: auto;
}
.modal-card {
  width: min(400px, 92vw);
  background: #fff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  transform: scale(0.95);
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: flex;
  flex-direction: column;
}
.modal-overlay.open .modal-card {
  transform: scale(1);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 12px;
}
.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
}
.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  transition: color 0.15s ease;
}
.close-btn:hover {
  color: #475569;
}
.modal-tabs {
  display: flex;
  border-bottom: 1px solid #e2e8f0;
  padding: 0 24px;
}
.tab-btn {
  flex: 1;
  background: none;
  border: none;
  padding: 12px 8px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s ease;
}
.tab-btn:hover {
  color: #334155;
}
.tab-btn.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
}
.modal-form {
  padding: 24px;
  display: grid;
  gap: 16px;
}
.form-label {
  display: grid;
  gap: 6px;
  font-size: 0.88rem;
  font-weight: 650;
  color: #475569;
}
input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  color: #1e293b;
  font: inherit;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}
input:disabled {
  background: #f8fafc;
  color: #94a3b8;
  cursor: not-allowed;
}
.submit-btn {
  width: 100%;
  padding: 11px;
  border: 1px solid #2563eb;
  border-radius: 8px;
  background: #3b82f6;
  color: #fff;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.95rem;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  transition: all 0.15s ease;
}
.submit-btn:hover:not(:disabled) {
  background: #2563eb;
}
.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #fff;
  border-bottom-color: transparent;
  border-radius: 50%;
  display: inline-block;
  animation: rotation 1s linear infinite;
}
@keyframes rotation {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.error {
  color: #dc2626;
  font-size: 0.85rem;
  font-weight: 600;
  margin: 0;
  line-height: 1.4;
}
</style>
