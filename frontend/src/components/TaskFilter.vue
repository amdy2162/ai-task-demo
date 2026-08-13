<script setup lang="ts">
import { ref, watch } from 'vue'
import type { StatusFilter, ViewMode } from '../stores/taskStore'
import type { TaskStatus } from '../types/task'

const props = defineProps<{
  selectedStatus: StatusFilter
  viewMode: ViewMode
  searchQuery: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
}>()

const emit = defineEmits<{
  (e: 'filterChange', status: StatusFilter): void
  (e: 'viewModeChange', mode: ViewMode): void
  (e: 'searchChange', search: string): void
  (e: 'sortChange', sortBy: string, sortOrder: 'asc' | 'desc'): void
}>()

const statuses: TaskStatus[] = ['Todo', 'Doing', 'Done']
const localSearch = ref(props.searchQuery)
let debounceTimeout: ReturnType<typeof setTimeout> | null = null

watch(localSearch, (newVal) => {
  if (debounceTimeout) {
    clearTimeout(debounceTimeout)
  }
  debounceTimeout = setTimeout(() => {
    emit('searchChange', newVal)
  }, 300)
})

watch(() => props.searchQuery, (newVal) => {
  localSearch.value = newVal
})

function onFilterChange(event: Event): void {
  const target = event.target as HTMLSelectElement
  emit('filterChange', target.value as StatusFilter)
}

function onSortByChange(event: Event): void {
  const target = event.target as HTMLSelectElement
  emit('sortChange', target.value, props.sortOrder)
}

function toggleSortOrder(): void {
  const nextOrder = props.sortOrder === 'asc' ? 'desc' : 'asc'
  emit('sortChange', props.sortBy, nextOrder)
}
</script>

<template>
  <div class="toolbar">
    <div class="toolbar-info">
      <h2 id="tasks-heading">Tasks</h2>
      <p>Use the controls below to search, sort, and organize your tasks.</p>
    </div>
    <div class="toolbar-controls">
      <div class="control-group">
        <label class="control-label search-control">
          Search
          <input
            v-model="localSearch"
            type="text"
            data-test="search-input"
            placeholder="Search by title..."
          />
        </label>

        <label class="control-label">
          Sort By
          <select :value="sortBy" data-test="sort-by" @change="onSortByChange">
            <option value="createdAt">Created Date</option>
            <option value="title">Title</option>
          </select>
        </label>

        <button
          type="button"
          class="btn-sort-order"
          data-test="toggle-sort-order"
          :title="sortOrder === 'asc' ? 'Sort Ascending' : 'Sort Descending'"
          @click="toggleSortOrder"
        >
          {{ sortOrder === 'asc' ? '▲' : '▼' }}
        </button>

        <label class="control-label filter">
          Filter
          <select :value="selectedStatus" data-test="filter" @change="onFilterChange">
            <option value="All">All</option>
            <option v-for="status in statuses" :key="status" :value="status">{{ status }}</option>
          </select>
        </label>
      </div>

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
.control-group {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}
.control-label {
  display: grid;
  gap: 4px;
  font-size: 0.85rem;
  font-weight: 650;
  color: #475569;
}
.search-control {
  min-width: 180px;
}
input[type="text"], select {
  padding: 8px 10px;
  border: 1px solid #bfc8d9;
  border-radius: 7px;
  background: #fff;
  font: inherit;
  color: inherit;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
input[type="text"]:focus, select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}
.btn-sort-order {
  padding: 8px 12px;
  border: 1px solid #bfc8d9;
  border-radius: 7px;
  background: #f8fafc;
  color: #475569;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.15s ease;
}
.btn-sort-order:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}
@media (max-width: 768px) {
  .toolbar { flex-direction: column; align-items: stretch; }
  .toolbar-controls { flex-direction: column; width: 100%; align-items: stretch; }
  .control-group { width: 100%; flex-direction: column; align-items: stretch; }
  .search-control, .control-label, .btn-sort-order { width: 100%; }
  .view-switch { width: 100%; }
  .btn-view { flex: 1; text-align: center; }
}
</style>
