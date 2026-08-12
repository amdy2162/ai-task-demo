<script setup lang="ts">
import type { StatusFilter, ViewMode } from '../stores/taskStore'
import type { TaskStatus } from '../types/task'

defineProps<{
  selectedStatus: StatusFilter
  viewMode: ViewMode
}>()

const emit = defineEmits<{
  (e: 'filterChange', status: StatusFilter): void
  (e: 'viewModeChange', mode: ViewMode): void
}>()

const statuses: TaskStatus[] = ['Todo', 'Doing', 'Done']

function onFilterChange(event: Event): void {
  const target = event.target as HTMLSelectElement
  emit('filterChange', target.value as StatusFilter)
}
</script>

<template>
  <div class="toolbar">
    <div class="toolbar-info">
      <h2 id="tasks-heading">Tasks</h2>
      <p>Use the status selector to keep each task current.</p>
    </div>
    <div class="toolbar-controls">
      <div class="view-switch" role="group" aria-label="View switch">
        <button
          type="button"
          class="btn-view"
          :class="{ active: viewMode === 'list' }"
          data-test="view-list"
          @click="emit('viewModeChange', 'list')"
        >
          List
        </button>
        <button
          type="button"
          class="btn-view"
          :class="{ active: viewMode === 'kanban' }"
          data-test="view-kanban"
          @click="emit('viewModeChange', 'kanban')"
        >
          Kanban
        </button>
      </div>
      <label class="filter">
        Filter
        <select :value="selectedStatus" data-test="filter" @change="onFilterChange">
          <option value="All">All</option>
          <option v-for="status in statuses" :key="status" :value="status">{{ status }}</option>
        </select>
      </label>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 16px;
}
.toolbar-info h2 {
  margin: 0;
  font-size: 1.35rem;
  color: #172033;
}
.toolbar-info p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 0.9rem;
}
.toolbar-controls {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}
.view-switch {
  display: flex;
  background: #e2e8f0;
  border-radius: 8px;
  padding: 2px;
}
.btn-view {
  padding: 7px 14px;
  border: none;
  background: transparent;
  color: #475569;
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-view.active {
  background: #ffffff;
  color: #1e293b;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}
.filter {
  min-width: 140px;
  display: grid;
  gap: 4px;
  font-size: 0.85rem;
  font-weight: 650;
}
select {
  padding: 8px 10px;
  border: 1px solid #bfc8d9;
  border-radius: 7px;
  background: #fff;
  font: inherit;
  color: inherit;
}
@media (max-width: 560px) {
  .toolbar { flex-direction: column; align-items: stretch; }
  .toolbar-controls { flex-direction: column; width: 100%; }
  .filter { width: 100%; }
  .view-switch { width: 100%; }
  .btn-view { flex: 1; text-align: center; }
}
</style>
