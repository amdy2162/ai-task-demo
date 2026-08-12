<script setup lang="ts">
defineProps<{
  error?: string
}>()
</script>

<template>
  <div v-if="error" class="notification-error" role="alert" data-test="global-error">
    <svg class="icon" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" />
    </svg>
    <span>{{ error }}</span>
  </div>
</template>

<style scoped>
.notification-error {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #b91c1c;
  font-weight: 500;
  font-size: 0.9rem;
  margin-bottom: 16px;
}
.icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}
</style>
