# Task Management Demo

## Goal

建立一個簡單的任務管理系統，
展示 AI Coding Agent 如何協助需求分析、
程式生成、Code Review 與測試。

## Tech Stack

Frontend
- Vue 3
- TypeScript
- Pinia
- Vite
- @microsoft/signalr

Backend
- ASP.NET Core Web API
- ASP.NET Core SignalR
- Entity Framework Core
- SQLite

## Task

欄位：

- id
- title
- description
- status
- createdAt

## Status

- Todo
- Doing
- Done

## Functions

1. 查詢 Task（支援關鍵字模糊搜尋與動態排序）
2. 新增 Task
3. 修改 Task Status
4. 依 Status 篩選
5. 刪除 Task
6. 編輯 Task (標題、描述、狀態)

## Validation

- title 必填
- title 最大 100 字
- status 必須為 Todo / Doing / Done

## API & Hub

GET /api/tasks
- Query 參數：
  - `status`: `Todo` / `Doing` / `Done` (依狀態篩選)
  - `search`: 關鍵字模糊搜尋 (比對 `title` 與 `description`)
  - `sortBy`: 排序欄位 (`title` / `status` / `createdAt`，預設為 `createdAt`)
  - `sortOrder`: 排序方向 (`asc` / `desc`，預設為 `desc`)

POST /api/tasks

PUT /api/tasks/{id}
- Request Body: `{ "title": "...", "description": "...", "status": "..." }`

PATCH /api/tasks/{id}/status

DELETE /api/tasks/{id}

### SignalR Hub

端點：`/hubs/tasks`

廣播事件：
- `TaskCreated`：新增任務時廣播
- `TaskUpdated`：修改任務狀態或編輯任務時廣播
- `TaskDeleted`：刪除任務時廣播

## Global Exception Handling (RFC 7807)

後端採用全域例外處理中介軟體 (`GlobalExceptionMiddleware`)，任何未處理之例外統一回傳 HTTP 500 與 `application/problem+json` 格式，符合 RFC 7807 `ProblemDetails` 規範：

```json
{
  "title": "An unexpected error occurred on the server.",
  "status": 500,
  "detail": "<Exception Message>",
  "instance": "/api/tasks"
}
```

## Acceptance Criteria

- 可以新增 Task
- 可以查詢 Task
- 可以修改 Task 狀態
- 可以編輯 Task (更新標題、描述與狀態)
- 可以刪除 Task
- 可以依關鍵字模糊搜尋 Task (搜尋 `title` 與 `description`)
- 可以依指定欄位 (`title`, `status`, `createdAt`) 與方向 (`asc`, `desc`) 動態排序 Task
- 不允許空白 title
- title 超過 100 字回傳 400
- 多視窗/多裝置操作時即時推送更新，無需手動重新整理
- 伺服器端未處理例外統一回傳 RFC 7807 ProblemDetails 格式
- 具備 Playwright E2E 自動化測試模擬真實使用者操作（新增/驗證/看板/刪除）
- 具備 GitHub Actions CI/CD Pipeline 在每次 Push/PR 自動執行前後端全套測試與建置檢查

## 後續補充

開發過程中，根據測試、實際操作與 Code Review 補充以下規則：

- createdAt 由後端產生，前端不需要傳入
- createdAt 使用台灣時間 UTC+8
- 空白 title 視為不合法
- status 不合法時回傳 400
- status 不允許數字或組合字串，例如 99、Todo,Doing
