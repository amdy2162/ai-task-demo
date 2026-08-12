# Delete Task Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 為系統新增「刪除任務 (Delete Task)」功能，包含後端 `DELETE /api/tasks/{id}` 端點、EF Core 資料刪除、前端 API 封裝、Pinia Store 狀態管理、UI 操作按鈕、以及完整的前後端自動化測試與文件更新。

**Architecture:** 後端透過 `DELETE /api/tasks/{id}` 接收刪除請求，由 `TaskService` 查詢並從 SQLite / EF Core 移除資料，成功回傳 `204 No Content`，不存在則回傳 `404 Not Found`。前端在 `taskApi.ts` 與 `taskStore.ts` 封裝刪除方法，在 `App.vue` 任務卡片上提供刪除按鈕並在刪除後自動重整目前篩選清單與處理錯誤提示。

**Tech Stack:** ASP.NET Core Web API, Entity Framework Core, SQLite, xUnit, Vue 3, TypeScript, Pinia, Axios, Vitest.

---

### Task 1: Backend - Delete Task API Endpoint & Tests

**Files:**
- Modify: `backend/Services/TaskService.cs`
- Modify: `backend/Controllers/TasksController.cs`
- Test: `backend.tests/TasksApiTests.cs`

- [ ] **Step 1: Write failing backend integration tests for DELETE endpoint**

Add tests to `backend.tests/TasksApiTests.cs`:
```csharp
    [Fact]
    public async Task Delete_removes_task_and_returns_no_content()
    {
        await SeedAsync(NewItem("Task to delete", TaskState.Todo, DateTime.UtcNow));
        int id;
        using (var scope = factory.Services.CreateScope())
        {
            id = scope.ServiceProvider.GetRequiredService<AppDbContext>().Tasks.Single().Id;
        }

        var response = await factory.CreateClient().DeleteAsync($"/api/tasks/{id}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        using var verifyScope = factory.Services.CreateScope();
        var exists = await verifyScope.ServiceProvider.GetRequiredService<AppDbContext>()
            .Tasks.AnyAsync(task => task.Id == id);
        Assert.False(exists);
    }

    [Fact]
    public async Task Delete_returns_not_found_for_unknown_id()
    {
        var response = await factory.CreateClient().DeleteAsync("/api/tasks/99999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `dotnet test backend.tests/AiTaskDemo.Api.Tests.csproj --filter "FullyQualifiedName~Delete_"`
Expected: FAIL with `405 Method Not Allowed` or `404 Not Found` (endpoint doesn't exist yet).

- [ ] **Step 3: Implement TaskService.DeleteAsync and TasksController.Delete**

In `backend/Services/TaskService.cs`, add `DeleteAsync`:
```csharp
    public async Task<bool> DeleteAsync(int id, CancellationToken cancellationToken)
    {
        var item = await db.Tasks.FindAsync([id], cancellationToken);
        if (item is null)
        {
            return false;
        }

        db.Tasks.Remove(item);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }
```

In `backend/Controllers/TasksController.cs`, add `Delete` action:
```csharp
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(
        int id,
        CancellationToken cancellationToken)
    {
        var deleted = await service.DeleteAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
```

- [ ] **Step 4: Run all backend tests to verify they pass**

Run: `dotnet test backend.tests/AiTaskDemo.Api.Tests.csproj`
Expected: ALL PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/Services/TaskService.cs backend/Controllers/TasksController.cs backend.tests/TasksApiTests.cs
git commit -m "feat(backend): add DELETE /api/tasks/{id} endpoint with tests"
```

---

### Task 2: Frontend API & Pinia Store - deleteTask & Tests

**Files:**
- Modify: `frontend/src/api/taskApi.ts`
- Modify: `frontend/src/stores/taskStore.ts`
- Test: `frontend/tests/taskStore.spec.ts`

- [ ] **Step 1: Write failing unit tests for taskStore deleteTask / removeTask**

In `frontend/tests/taskStore.spec.ts`, add:
```typescript
  it('deletes a task then reloads the active filter', async () => {
    vi.mocked(taskApi.deleteTask).mockResolvedValue()
    vi.mocked(taskApi.getTasks).mockResolvedValue([])
    const store = useTaskStore()
    store.tasks = [sample]
    store.selectedStatus = 'Todo'

    await store.removeTask(1)

    expect(taskApi.deleteTask).toHaveBeenCalledWith(1)
    expect(taskApi.getTasks).toHaveBeenCalledWith('Todo')
    expect(store.tasks).toEqual([])
  })

  it('reports delete failures', async () => {
    vi.mocked(taskApi.deleteTask).mockRejectedValue(new Error('offline'))
    const store = useTaskStore()

    await store.removeTask(1)

    expect(store.error).toBe('Unable to delete task.')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- tests/taskStore.spec.ts`
Expected: FAIL with `store.removeTask is not a function` or similar.

- [ ] **Step 3: Implement deleteTask in taskApi.ts and removeTask in taskStore.ts**

In `frontend/src/api/taskApi.ts`, add:
```typescript
export async function deleteTask(id: number): Promise<void> {
  await apiClient.delete(`/tasks/${id}`)
}
```

In `frontend/src/stores/taskStore.ts`, import `deleteTask` and add `removeTask`:
```typescript
  async function removeTask(id: number): Promise<void> {
    error.value = ''
    try {
      await deleteTask(id)
      await fetchTasks()
    } catch {
      error.value = 'Unable to delete task.'
    }
  }
```
Expose `removeTask` in the return object:
```typescript
  return { tasks, selectedStatus, isLoading, error, fetchTasks, setStatusFilter, addTask, changeStatus, removeTask }
```

- [ ] **Step 4: Run store tests to verify they pass**

Run: `cd frontend && npm test -- tests/taskStore.spec.ts`
Expected: ALL PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api/taskApi.ts frontend/src/stores/taskStore.ts frontend/tests/taskStore.spec.ts
git commit -m "feat(frontend): add deleteTask API and store action with tests"
```

---

### Task 3: Frontend UI - Delete Button & Component Tests

**Files:**
- Modify: `frontend/src/App.vue`
- Test: `frontend/tests/App.spec.ts`

- [ ] **Step 1: Write failing component tests for Delete Task interaction in App.spec.ts**

In `frontend/tests/App.spec.ts`, add:
```typescript
  it('deletes a task and refreshes the list', async () => {
    const item = {
      id: 9,
      title: 'Task to delete',
      description: '',
      status: 'Todo' as const,
      createdAt: '2026-08-10T00:00:00Z',
    }
    vi.mocked(taskApi.getTasks).mockResolvedValue([item])
    vi.mocked(taskApi.deleteTask).mockResolvedValue()
    const wrapper = mountApp()

    await vi.waitFor(() => expect(wrapper.text()).toContain('Task to delete'))

    await wrapper.get('[data-test="delete-task-9"]').trigger('click')

    await vi.waitFor(() => expect(taskApi.deleteTask).toHaveBeenCalledWith(9))
  })

  it('shows error when deleting a task fails', async () => {
    const item = {
      id: 10,
      title: 'Cannot delete me',
      description: '',
      status: 'Todo' as const,
      createdAt: '2026-08-10T00:00:00Z',
    }
    vi.mocked(taskApi.getTasks).mockResolvedValue([item])
    vi.mocked(taskApi.deleteTask).mockRejectedValue(new Error('offline'))
    const wrapper = mountApp()

    await vi.waitFor(() => expect(wrapper.text()).toContain('Cannot delete me'))

    await wrapper.get('[data-test="delete-task-10"]').trigger('click')

    await vi.waitFor(() => expect(wrapper.text()).toContain('Unable to delete task.'))
  })
```

- [ ] **Step 2: Run component tests to verify it fails**

Run: `cd frontend && npm test -- tests/App.spec.ts`
Expected: FAIL because `[data-test="delete-task-9"]` cannot be found.

- [ ] **Step 3: Update App.vue to add delete button and styles**

In `frontend/src/App.vue`:
Add delete handler in `<script setup>`:
```typescript
function deleteTask(id: number): void {
  void store.removeTask(id)
}
```

In the template `<li v-for="task in tasks" ...>`, add the action container with delete button:
```html
          <div class="actions">
            <label class="status-control">
              Status
              <select :value="task.status" :data-test="`task-status-${task.id}`" @change="statusChanged(task.id, $event)">
                <option v-for="status in statuses" :key="status" :value="status">{{ status }}</option>
              </select>
            </label>
            <button
              type="button"
              class="btn-delete"
              :data-test="`delete-task-${task.id}`"
              aria-label="Delete task"
              @click="deleteTask(task.id)"
            >
              Delete
            </button>
          </div>
```

In `<style scoped>`, add styling for `.actions` and `.btn-delete`:
```css
.actions { display: flex; align-items: flex-end; gap: 12px; }
.btn-delete { padding: 9px 12px; border: 1px solid #fecdd3; border-radius: 7px; background: #fff1f2; color: #be123c; cursor: pointer; font-weight: 600; font-size: 0.85rem; }
.btn-delete:hover { background: #ffe4e6; border-color: #fda4af; }
```

- [ ] **Step 4: Run all frontend tests and build to verify**

Run: `cd frontend && npm test && npm run build`
Expected: ALL PASS and build succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.vue frontend/tests/App.spec.ts
git commit -m "feat(frontend): add delete task button in UI with tests"
```

---

### Task 4: Documentation Updates (SPEC.md, README.md, ROLES.md)

**Files:**
- Modify: `SPEC.md`
- Modify: `README.md`
- Modify: `ROLES.md`

- [ ] **Step 1: Update SPEC.md**
  - Add `5. 刪除 Task` 到 Functions 清單
  - Add `DELETE /api/tasks/{id}` 到 API 清單
  - Add `可以刪除 Task` 到 Acceptance Criteria 清單

- [ ] **Step 2: Update README.md**
  - Add `刪除任務` 到功能列表
  - Add `DELETE | /api/tasks/{id} | 刪除指定任務 |` 到 API 表格

- [ ] **Step 3: Update ROLES.md**
  - Add 刪除任務相關說明到全端、前端、QA 角色與驗收重點表格中

- [ ] **Step 4: Run all test suites across backend and frontend**

Run:
```powershell
dotnet test backend.tests/AiTaskDemo.Api.Tests.csproj
cd frontend && npm test
```
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add SPEC.md README.md ROLES.md
git commit -m "docs: update spec, readme, and roles with delete task functionality"
```
