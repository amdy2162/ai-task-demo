<script setup lang="ts">
import TaskItem from './TaskItem.vue'
import type { TaskItem as TaskItemType, TaskStatus } from '../types/task'

defineProps<{
  tasks: TaskItemType[]
}>()

const emit = defineEmits<{
  (e: 'statusChange', id: number, status: TaskStatus): void
  (e: 'edit', id: number, title: string, description: string): void
  (e: 'delete', id: number): void
}>()
</script>

<template>
  <TransitionGroup name="task-anim" tag="ul" class="tasks">
    <TaskItem
      v-for="task in tasks"
      :key="task.id"
      :task="task"
      @status-change="(id, status) => emit('statusChange', id, status)"
      @edit="(id, title, desc) => emit('edit', id, title, desc)"
      @delete="id => emit('delete', id)"
    />
  </TransitionGroup>
</template>

<style scoped>
.tasks {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* 絲滑平滑動畫：新增淡入、刪除淡出、其餘卡片平順遞補 */
.task-anim-enter-active,
.task-anim-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.task-anim-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.task-anim-leave-to {
  opacity: 0;
  transform: scale(0.96) translateX(10px);
}

.task-anim-move {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
