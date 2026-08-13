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
    <div class="toolbar-header">
      <div class="toolbar-info">
        <h2 id="tasks-heading">Tasks</h2>
        <p>Use the controls below to search, sort, and organize your tasks.</p>
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

    <div class="toolbar-controls">
      <div class="search-box">
        <svg class="icon-search" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd" />
        </svg>
        <input
          v-model="localSearch"
          type="text"
          class="input-search"
          data-test="search-input"
          placeholder="Search tasks by title..."
        />
      </div>

      <div class="filters-group">
        <select :value="selectedStatus" class="select-filter" data-test="filter" @change="onFilterChange" aria-label="Filter status">
          <option value="All">All Statuses</option>
          <option v-for="status in statuses" :key="status" :value="status">{{ status }}</option>
        </select>

        <div class="sort-group">
          <select :value="sortBy" class="select-sort" data-test="sort-by" @change="onSortByChange" aria-label="Sort by">
            <option value="createdAt">Date Created</option>
            <option value="title">Title</option>
          </select>
          <button
            type="button"
            class="btn-sort-order"
            data-test="toggle-sort-order"
            :title="sortOrder === 'asc' ? 'Sort Ascending' : 'Sort Descending'"
            @click="toggleSortOrder"
          >
            {{ sortOrder === 'asc' ? '▲' : '▼' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.toolbar-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
}

.toolbar-info h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
}

.toolbar-info p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 0.95rem;
}

.view-switch {
  display: flex;
  background: #f1f5f9;
  border-radius: 8px;
  padding: 4px;
  border: 1px solid #e2e8f0;
}

.btn-view {
  padding: 6px 16px;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-view:hover {
  color: #334155;
}

.btn-view.active {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.toolbar-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 240px;
  max-width: 400px;
}

.icon-search {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: #94a3b8;
}

.input-search {
  width: 100%;
  padding: 8px 12px 8px 36px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  font: inherit;
  font-size: 0.9rem;
  color: #1e293b;
  transition: all 0.2s ease;
}

.input-search:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.input-search::placeholder {
  color: #94a3b8;
}

.filters-group {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.select-filter,
.select-sort {
  padding: 8px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  font: inherit;
  font-size: 0.9rem;
  color: #1e293b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.select-filter:focus,
.select-sort:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.sort-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-sort-order {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  color: #475569;
  cursor: pointer;
  font-weight: bold;
  font-size: 1.1rem;
  transition: all 0.2s ease;
}

.btn-sort-order:hover {
  background: #f1f5f9;
  color: #0f172a;
  border-color: #94a3b8;
}

@media (max-width: 768px) {
  .toolbar-header {
    flex-direction: column;
    align-items: stretch;
  }
  .toolbar-controls {
    flex-direction: column;
    align-items: stretch;
  }
  .search-box {
    max-width: 100%;
  }
  .filters-group {
    justify-content: space-between;
  }
}
</style>
