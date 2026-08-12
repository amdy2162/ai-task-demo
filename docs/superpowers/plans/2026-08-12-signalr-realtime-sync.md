# SignalR Real-Time Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 為專案新增 ASP.NET Core SignalR 即時通訊與前端即時同步（Real-time Sync）功能，在多視窗/多人操作時，任何新增、修改狀態、刪除任務的操作皆會即時推送至所有連接的客戶端並自動更新畫面。

**Architecture:** 後端建立 `TaskHub` (`/hubs/tasks`)，在 `TasksController` 發生 CRUD 異動時透過 `IHubContext<TaskHub>` 廣播事件（`TaskCreated`, `TaskUpdated`, `TaskDeleted`）；前端引入 `@microsoft/signalr` 建立 `signalrService.ts`，與 Pinia Store 整合自動監聽事件並即時刷新任務資料，在畫面提供連線狀態提示。

**Tech Stack:** ASP.NET Core SignalR, Vue 3, Pinia, TypeScript, `@microsoft/signalr`, Vitest, xUnit.

---

### Task 1: Backend SignalR Hub & Controller Broadcast

**Files:**
- Create: `backend/Hubs/TaskHub.cs`
- Modify: `backend/Program.cs`
- Modify: `backend/Controllers/TasksController.cs`
- Test: `backend.tests/TasksApiTests.cs`

- [ ] **Step 1: Write backend tests verifying TaskHub registration and controller mutations**

In `backend.tests/TasksApiTests.cs`, verify Hub endpoint is mapped:
```csharp
    [Fact]
    public async Task Hub_endpoint_is_accessible()
    {
        var response = await factory.CreateClient().GetAsync("/hubs/tasks/negotiate?negotiateVersion=1");
        // SignalR negotiate endpoint returns OK or BadRequest with connection info
        Assert.True(response.IsSuccessStatusCode || response.StatusCode == HttpStatusCode.BadRequest);
    }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `dotnet test backend.tests/AiTaskDemo.Api.Tests.csproj --filter "FullyQualifiedName~Hub_"`
Expected: FAIL (404 NotFound because hub is not mapped yet).

- [ ] **Step 3: Implement TaskHub, configure Program.cs, and broadcast events in TasksController**

Create `backend/Hubs/TaskHub.cs`:
```csharp
using Microsoft.AspNetCore.SignalR;

namespace AiTaskDemo.Api.Hubs;

public sealed class TaskHub : Hub
{
}
```

In `backend/Program.cs`:
- Add `using AiTaskDemo.Api.Hubs;`
- Add `builder.Services.AddSignalR();`
- Update CORS with `.AllowCredentials()`
- Add `app.MapHub<TaskHub>("/hubs/tasks");`

In `backend/Controllers/TasksController.cs`:
- Inject `IHubContext<TaskHub> hubContext`
- In `Create`:
  ```csharp
  var response = ToResponse(item);
  await hubContext.Clients.All.SendAsync("TaskCreated", response, cancellationToken);
  return StatusCode(StatusCodes.Status201Created, response);
  ```
- In `UpdateStatus`:
  ```csharp
  var response = ToResponse(item);
  await hubContext.Clients.All.SendAsync("TaskUpdated", response, cancellationToken);
  return Ok(response);
  ```
- In `Delete`:
  ```csharp
  var deleted = await service.DeleteAsync(id, cancellationToken);
  if (!deleted) return NotFound();
  await hubContext.Clients.All.SendAsync("TaskDeleted", id, cancellationToken);
  return NoContent();
  ```

- [ ] **Step 4: Run all backend tests to verify they pass**

Run: `dotnet test backend.tests/AiTaskDemo.Api.Tests.csproj`
Expected: ALL PASS (34/34 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/Hubs/TaskHub.cs backend/Program.cs backend/Controllers/TasksController.cs backend.tests/TasksApiTests.cs
git commit -m "feat(backend): add SignalR TaskHub and broadcast events in TasksController"
```

---

### Task 2: Frontend @microsoft/signalr Service & Pinia Store Integration

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/src/services/signalrService.ts`
- Modify: `frontend/src/stores/taskStore.ts`
- Create: `frontend/tests/signalrService.spec.ts`
- Modify: `frontend/tests/taskStore.spec.ts`

- [ ] **Step 1: Install @microsoft/signalr package**

Run in `frontend`:
```bash
npm install @microsoft/signalr
```

- [ ] **Step 2: Write failing unit test for signalrService and store listener**

Create `frontend/tests/signalrService.spec.ts`:
```typescript
import { describe, expect, it, vi } from 'vitest'
import { createSignalRService } from '../src/services/signalrService'

describe('signalrService', () => {
  it('creates HubConnection with configured URL and registers event handlers', () => {
    const service = createSignalRService('http://localhost:5000/hubs/tasks')
    expect(service).toBeDefined()
    expect(typeof service.start).toBe('function')
    expect(typeof service.stop).toBe('function')
    expect(typeof service.onTaskEvent).toBe('function')
  })
})
```

- [ ] **Step 3: Implement signalrService.ts and taskStore real-time synchronization**

Create `frontend/src/services/signalrService.ts`:
```typescript
import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr'

export interface SignalRService {
  start(): Promise<void>
  stop(): Promise<void>
  isConnected(): boolean
  onTaskEvent(callback: () => void): void
}

export function createSignalRService(
  hubUrl = import.meta.env.VITE_HUB_URL ?? 'http://localhost:5000/hubs/tasks'
): SignalRService {
  let connection: HubConnection | null = null
  const listeners: Array<() => void> = []

  function getConnection(): HubConnection {
    if (!connection) {
      connection = new HubConnectionBuilder()
        .withUrl(hubUrl)
        .withAutomaticReconnect([0, 2000, 5000, 10000])
        .configureLogging(LogLevel.Warning)
        .build()

      connection.on('TaskCreated', () => listeners.forEach(fn => fn()))
      connection.on('TaskUpdated', () => listeners.forEach(fn => fn()))
      connection.on('TaskDeleted', () => listeners.forEach(fn => fn()))
    }
    return connection
  }

  return {
    async start(): Promise<void> {
      const conn = getConnection()
      if (conn.state === HubConnectionState.Disconnected) {
        try {
          await conn.start()
        } catch {
          // Graceful fallback if offline
        }
      }
    },
    async stop(): Promise<void> {
      if (connection && connection.state !== HubConnectionState.Disconnected) {
        await connection.stop()
      }
    },
    isConnected(): boolean {
      return connection?.state === HubConnectionState.Connected
    },
    onTaskEvent(callback: () => void): void {
      listeners.push(callback)
    },
  }
}

export const signalRService = createSignalRService()
```

In `frontend/src/stores/taskStore.ts`:
- Import `signalRService`
- In `useTaskStore`:
  ```typescript
  const isRealtimeConnected = ref(false)

  async function startRealtime(): Promise<void> {
    signalRService.onTaskEvent(() => {
      void fetchTasks()
    })
    await signalRService.start()
    isRealtimeConnected.value = signalRService.isConnected()
  }

  async function stopRealtime(): Promise<void> {
    await signalRService.stop()
    isRealtimeConnected.value = false
  }
  ```
- Expose `isRealtimeConnected`, `startRealtime`, `stopRealtime` in store return.

- [ ] **Step 4: Run unit tests to verify they pass**

Run: `cd frontend && npm test -- tests/signalrService.spec.ts tests/taskStore.spec.ts`
Expected: ALL PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/services/signalrService.ts frontend/src/stores/taskStore.ts frontend/tests/signalrService.spec.ts frontend/tests/taskStore.spec.ts
git commit -m "feat(frontend): add SignalR service and Pinia real-time sync with tests"
```

---

### Task 3: UI Live Sync Lifecycle & Status Indicator in App.vue

**Files:**
- Modify: `frontend/src/App.vue`
- Test: `frontend/tests/App.spec.ts`

- [ ] **Step 1: Write component test in App.spec.ts for real-time lifecycle**

In `frontend/tests/App.spec.ts`, verify App mounts without errors and initializes store real-time:
```typescript
  it('starts real-time sync on mount', async () => {
    const wrapper = mountApp()
    await vi.waitFor(() => expect(wrapper.text()).toContain('Task Management'))
  })
```

- [ ] **Step 2: Update App.vue to initialize real-time sync and display live indicator badge**

In `frontend/src/App.vue`:
- Import `onUnmounted` from `vue`
- Call `store.startRealtime()` on `onMounted` and `store.stopRealtime()` on `onUnmounted`
- Add live sync indicator in the header:
  ```html
  <div class="header-badges">
    <span class="eyebrow">WORKSPACE</span>
    <span class="live-badge" :class="{ connected: isRealtimeConnected }">
      <span class="live-dot"></span>
      {{ isRealtimeConnected ? 'Live Sync' : 'Offline' }}
    </span>
  </div>
  ```
- Add CSS styling for `.live-badge` and `.live-dot` with subtle pulse animation.

- [ ] **Step 3: Run all frontend tests and build check**

Run: `cd frontend && npm test && npm run build`
Expected: ALL PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.vue frontend/tests/App.spec.ts
git commit -m "feat(frontend): integrate real-time sync lifecycle and live badge in App.vue"
```

---

### Task 4: Documentation Updates & Full End-to-End Verification

**Files:**
- Modify: `SPEC.md`
- Modify: `README.md`
- Modify: `ROLES.md`

- [ ] **Step 1: Update SPEC.md**
  - Add `SignalR /hubs/tasks` 即時事件廣播規格（`TaskCreated`, `TaskUpdated`, `TaskDeleted`）
  - Add Acceptance Criteria：多視窗/多裝置即時同步更新

- [ ] **Step 2: Update README.md**
  - Add SignalR 到 Tech Stack
  - Add `/hubs/tasks` 到端點說明
  - Add 多視窗即時同步測試操作說明到 Demo 流程

- [ ] **Step 3: Update ROLES.md**
  - 更新全端、前端、QA 角色對於 SignalR 即時同步事件的責任與驗收重點

- [ ] **Step 4: Run all test suites across backend and frontend**

Run:
```powershell
dotnet test backend.tests/AiTaskDemo.Api.Tests.csproj
cd frontend && npm test
```
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add SPEC.md README.md ROLES.md docs/superpowers/plans/2026-08-12-signalr-realtime-sync.md
git commit -m "docs: update spec, readme, and roles with SignalR real-time sync"
```
