<script setup lang="ts">
import TaskItem from './TaskItem.vue'
import type { TaskItem as TaskItemType, TaskStatus } from '../types/task'

defineProps<{
  tasks: TaskItemType[]
}>()

const emit = defineEmits<{
  (e: 'statusChange', id: number, status: TaskStatus): void
  (e: 'delete', id: number): void
}>()
</script>

<template>
  <ul class="tasks">
    <TaskItem
      v-for="task in tasks"
      :key="task.id"
      :task="task"
      @status-change="(id, status) => emit('statusChange', id, status)"
      @delete="id => emit('delete', id)"
    />
  </ul>
</template>

<style scoped>
.tasks {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>
