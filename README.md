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

### Backend

- ASP.NET Core Web API
- Entity Framework Core
- SQLite
- xUnit

## 功能

使用者可以：

- 查詢任務列表
- 新增任務
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

## API

| Method | Endpoint | 說明 |
| --- | --- | --- |
| GET | `/api/tasks` | 查詢所有任務 |
| GET | `/api/tasks?status=Todo` | 依狀態篩選任務 |
| POST | `/api/tasks` | 新增任務 |
| PATCH | `/api/tasks/{id}/status` | 修改任務狀態 |
| DELETE | `/api/tasks/{id}` | 刪除任務 |

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

### 前端建置

```powershell
cd frontend
npm run build
```

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
3. 開啟 `http://localhost:5173`
4. 新增一筆任務
5. 使用狀態篩選
6. 修改任務狀態
7. 測試空白 title 與超過 100 字 title
8. 刪除任務並確認清單即時更新

## 文件說明

- `README.md`：專案啟動、測試與使用說明
- `SPEC.md`：需求規格與驗收規則
- `ROLES.md`：AI Coding Agent 角色設定與分工說明
