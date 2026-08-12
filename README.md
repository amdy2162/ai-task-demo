# AI Task Demo

一個簡單的任務管理系統，用來展示 AI Coding Agent 如何協助需求分析、程式生成、Code Review 與測試。

## Tech Stack

### Frontend

- Vue 3
- TypeScript
- Pinia
- Vite
- Axios
- Vitest
- `@microsoft/signalr`

### Backend

- ASP.NET Core Web API
- ASP.NET Core SignalR
- Entity Framework Core
- SQLite
- xUnit

## 功能

使用者可以：

- 查詢任務列表（支援狀態篩選、模糊搜尋與動態排序）
- 新增任務
- 編輯任務（標題、描述、狀態）
- 修改任務狀態
- 依狀態篩選任務
- 刪除任務

## Task 欄位

- `id`
- `title`
- `description`
- `status`
- `createdAt`

## Status

任務狀態只能是：

- `Todo`
- `Doing`
- `Done`

## 驗證規則

- `title` 必填
- `title` 不可只有空白
- `title` 最多 100 個字元
- `status` 只能是 `Todo`、`Doing`、`Done`
- 不合法輸入會回傳 `400 Bad Request`

## API & SignalR Hub

| Method / Protocol | Endpoint | 說明 |
| --- | --- | --- |
| GET | `/api/tasks` | 查詢所有任務（支援 `status` 篩選、`search` 模糊搜尋、`sortBy` 排序 `title`\|`status`\|`createdAt`、`sortOrder` `asc`\|`desc`） |
| POST | `/api/tasks` | 新增任務 |
| PUT | `/api/tasks/{id}` | 編輯任務（更新標題、描述與狀態，成功後廣播 `TaskUpdated`） |
| PATCH | `/api/tasks/{id}/status` | 修改任務狀態 |
| DELETE | `/api/tasks/{id}` | 刪除任務 |
| SignalR | `/hubs/tasks` | 即時通訊 Hub（廣播 `TaskCreated`, `TaskUpdated`, `TaskDeleted` 事件） |

## 全域例外處理 (Global Exception Handling)

後端採用 `GlobalExceptionMiddleware` 統一捕捉未處理之例外狀況，傳回符合 **RFC 7807** 標準的 `ProblemDetails` JSON 格式（`application/problem+json`）：

```json
{
  "title": "An unexpected error occurred on the server.",
  "status": 500,
  "detail": "Exception error message",
  "instance": "/api/tasks"
}
```

## 啟動後端

在專案根目錄執行：

```powershell
dotnet restore backend/AiTaskDemo.Api.csproj
dotnet run --project backend/AiTaskDemo.Api.csproj --urls http://localhost:5000
```

後端 API 會啟動在：

```text
http://localhost:5000
```

## 啟動前端

另開一個 PowerShell：

```powershell
cd frontend
npm ci
npm run dev
```

前端會啟動在：

```text
http://localhost:5173
```

## 執行測試

### 後端測試

```powershell
dotnet test backend.tests/AiTaskDemo.Api.Tests.csproj
```

### 後端建置

```powershell
dotnet build backend/AiTaskDemo.Api.csproj
```

### 前端測試
```powershell
cd frontend
npm test
```

### 前端 E2E 端到端測試 (Playwright)
```powershell
cd frontend
npm run test:e2e
```

### 前端建置
```powershell
cd frontend
npm run build
```

## CI/CD Pipeline (GitHub Actions)

專案包含完整的自動化 CI/CD 流水線（設定於 [`.github/workflows/ci.yml`](.github/workflows/ci.yml)），在每次 `git push` 或發起 `Pull Request` 時自動執行：

1. **後端 CI**：
   - 設定 .NET 10 SDK
   - 執行 `dotnet restore` 與 `dotnet build`
   - 執行全部 40 個 xUnit 整合測試並收集程式碼覆蓋率
2. **前端 CI**：
   - 設定 Node.js 22
   - 執行 `npm ci` 安裝套件
   - 執行 37 個 Vitest 單元/元件測試
   - 執行 `vue-tsc` 型別檢查與 `vite build` 生產建置
   - 安裝 Playwright 瀏覽器並執行 E2E 瀏覽器端到端測試
3. **品質閘門**：任何測試未通過將自動阻擋合併（Block PR merge）。

## SQLite 資料庫

SQLite 資料庫會建立在：

```text
backend/tasks.db
```

後端啟動時會自動建立資料庫檔案。只有在想清空本機測試資料時，才需要手動刪除這個檔案。

## 專案結構

```text
ai-task-demo/
├─ SPEC.md
├─ README.md
├─ frontend/
│  ├─ src/
│  │  ├─ api/
│  │  │  └─ taskApi.ts
│  │  ├─ stores/
│  │  │  └─ taskStore.ts
│  │  ├─ types/
│  │  │  └─ task.ts
│  │  ├─ App.vue
│  │  └─ main.ts
│  └─ tests/
└─ backend/
   ├─ Controllers/
   ├─ Data/
   ├─ DTOs/
   ├─ Models/
   ├─ Services/
   └─ Program.cs
```

## Demo 測試流程

1. 啟動後端
2. 啟動前端
3. 開啟兩個瀏覽器視窗存取 `http://localhost:5173`（驗證多視窗即時同步）
4. 在一邊新增一筆任務，確認另一邊即時同步顯示
5. 使用狀態篩選
6. 在一邊修改任務狀態，確認另一邊即時同步更新
7. 測試空白 title 與超過 100 字 title
8. 在一邊刪除任務，確認另一邊即時同步刪除並更新清單

## 文件說明

- `README.md`：專案啟動、測試與使用說明
- `SPEC.md`：需求規格與驗收規則
- `ROLES.md`：AI Coding Agent 角色設定與分工說明
