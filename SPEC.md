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

所有任務相關的 API 與 Hub 連線皆需要附帶 Authorization 標頭：`Authorization: Bearer <token>`。

### Auth API

#### POST /api/auth/register
- **作用**：使用者註冊帳號並自動取得登入憑證。
- **Request Body** (`RegisterRequest`)：
  ```json
  {
    "username": "UserA",
    "password": "password123"
  }
  ```
- **欄位驗證**：
  - `username`：必填，長度 3 ~ 50 字元。
  - `password`：必填，長度至少 6 字元。
- **Success Response** (201 Created, `AuthResponse`)：
  ```json
  {
    "token": "jwt-token-string",
    "user": {
      "id": 1,
      "username": "UserA",
      "createdAt": "2026-08-12T12:00:00Z"
    }
  }
  ```
- **Error Responses**：
  - 400 Bad Request：欄位格式驗證失敗。
  - 409 Conflict：使用者名稱已存在。回傳 ProblemDetails：
    ```json
    {
      "status": 409,
      "title": "Username already exists",
      "detail": "The username 'UserA' is already taken."
    }
    ```

#### POST /api/auth/login
- **作用**：使用者憑帳號密碼登入並取得憑證。
- **Request Body** (`LoginRequest`)：
  ```json
  {
    "username": "UserA",
    "password": "password123"
  }
  ```
- **Success Response** (200 OK, `AuthResponse`)：
  ```json
  {
    "token": "jwt-token-string",
    "user": {
      "id": 1,
      "username": "UserA",
      "createdAt": "2026-08-12T12:00:00Z"
    }
  }
  ```
- **Error Responses**：
  - 400 Bad Request：欄位缺少或格式錯誤。
  - 401 Unauthorized：帳密錯誤。回傳 ProblemDetails：
    ```json
    {
      "status": 401,
      "title": "Unauthorized",
      "detail": "Invalid username or password."
    }
    ```

#### GET /api/auth/me
- **作用**：取得當前登入使用者的個人 Profile。
- **Headers**：
  - `Authorization: Bearer <token>`
- **Success Response** (200 OK, `UserProfileResponse`)：
  ```json
  {
    "id": 1,
    "username": "UserA",
    "createdAt": "2026-08-12T12:00:00Z"
  }
  ```
- **Error Responses**：
  - 401 Unauthorized：缺少或無效的 Bearer Token。

### Task API

#### GET /api/tasks
- Query 參數：
  - `status`: `Todo` / `Doing` / `Done` (依狀態篩選)
  - `search`: 關鍵字模糊搜尋 (比對 `title` 與 `description`)
  - `sortBy`: 排序欄位 (`title` / `status` / `createdAt`，預設為 `createdAt`)
  - `sortOrder`: 排序方向 (`asc` / `desc`，預設為 `desc`)
  - `page`: 頁數 (整數，預設為 1，必須 >= 1)
  - `pageSize`: 每頁筆數 (整數，預設為 20，範圍 1 ~ 100)
- 回傳格式 (`PagedResult<TaskItem>`)：
```json
{
  "items": [
    {
      "id": 1,
      "title": "Task 1",
      "description": "...",
      "status": "Todo",
      "createdAt": "2026-08-12T12:00:00Z"
    }
  ],
  "totalCount": 1,
  "page": 1,
  "pageSize": 20,
  "totalPages": 1
}
```

#### POST /api/tasks
- Request Body: `{ "title": "...", "description": "...", "status": "..." }`

#### PUT /api/tasks/{id}
- Request Body: `{ "title": "...", "description": "...", "status": "..." }`

#### PATCH /api/tasks/{id}/status
- Request Body: `{ "status": "..." }`

#### DELETE /api/tasks/{id}

### SignalR Hub

端點：`/hubs/tasks`
（連線時需在 Query String 中傳入 `access_token` 連線憑證）

廣播事件：
- `TaskCreated`：新增任務時，僅廣播給該任務的建立者。
- `TaskUpdated`：修改/編輯任務時，僅廣播給該任務的擁有者。
- `TaskDeleted`：刪除任務時，僅廣播給該任務的擁有者。

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

### 基礎任務管理
- 可以新增 Task
- 可以查詢 Task
- 可以修改 Task 狀態
- 可以編輯 Task (更新標題、描述與狀態)
- 可以刪除 Task
- 可以依關鍵字模糊搜尋 Task (搜尋 `title` 與 `description`)
- 可以依指定欄位 (`title`, `status`, `createdAt`) 與方向 (`asc`, `desc`) 動態排序 Task
- 支援資料庫分頁查詢 (`page`, `pageSize`) 並回傳分頁元資料 (`totalCount`, `page`, `pageSize`, `totalPages`)
- 不允許空白 title
- title 超過 100 字回傳 400
- status 不合法時回傳 400
- page < 1 或 pageSize 不在 1..100 時回傳 400
- 多視窗/多裝置操作時即時推送更新，無需手動重新整理
- 伺服器端未處理例外統一回傳 RFC 7807 ProblemDetails 格式
- 具備 EF Core Migrations 資料庫版本遷移機制，應用程式啟動時自動執行遷移
- 具備 Playwright E2E 自動化測試模擬真實使用者操作（新增/驗證/看板/刪除）
- 具備 GitHub Actions CI/CD Pipeline 在每次 Push/PR 自動執行前後端全套測試與建置檢查

### 身分驗證與資料隔離 (JWT Authentication & Multi-User Isolation)
- **使用者驗證 (User Authentication)**：
  - 提供註冊功能，密碼經安全雜湊 (Hashing) 後儲存於資料庫，防止重複註冊。
  - 提供登入功能，驗證帳密成功後發行經 HMAC-SHA256 簽署的 JWT Token。
  - JWT Token 包含 `ClaimTypes.NameIdentifier` 作為使用者識別，以及 `ClaimTypes.Name` 作為使用者名稱。
  - 未登入時限制所有 API 存取 (回傳 401 Unauthorized) 且前端顯示登入引導畫面；登入後解鎖全部功能。
- **多用戶資料隔離 (Multi-User Task Isolation)**：
  - 每個 Task 綁定 `UserId`，任何使用者僅能看見、新增、修改與刪除自己建立的任務。
  - 跨用戶編輯或刪除他人任務時，後端應阻斷並回傳 404 Not Found。
  - SignalR 即時推播限制僅推送給該任務的擁有者 (`Clients.User(userId.ToString())`)，防止其他使用者收到非其擁有的任務異動事件。

## 後續補充

開發過程中，根據測試、實際操作與 Code Review 補充以下規則：

- createdAt 由後端產生，前端不需要傳入
- createdAt 使用台灣時間 UTC+8
- 空白 title 視為不合法
- status 不合法時回傳 400
- status 不允許數字或組合字串，例如 99、Todo,Doing
- 資料庫採用 EF Core Migrations 進行架構版本控制
