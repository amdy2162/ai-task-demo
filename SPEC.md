# AI 任務管理示範

## 需求說明

這是一個使用 Vue 前端與 ASP.NET Core API 建立的簡易任務管理系統。使用者可以：

- 查詢所有任務，或依 `Todo`、`Doing`、`Done` 篩選任務。
- 新增任務，包含標題、選填說明與狀態。
- 修改既有任務的狀態。
- 在標題空白、標題超過 100 字，或狀態不合法時收到驗證錯誤。

## 啟動後端

請在專案根目錄執行：

```powershell
dotnet restore backend/AiTaskDemo.Api.csproj
dotnet run --project backend/AiTaskDemo.Api.csproj --urls http://localhost:5000
```

後端 API 會啟動在：

```text
http://localhost:5000
```

## 啟動前端

請另外開啟一個 PowerShell 視窗，執行：

```powershell
Set-Location frontend
npm.cmd ci
npm.cmd run dev
```

接著用瀏覽器開啟：

```text
http://localhost:5173
```

前端 API client 預設會呼叫：

```text
http://localhost:5000
```

## 測試與建置

請在專案根目錄執行後端測試與建置：

```powershell
dotnet test backend.tests/AiTaskDemo.Api.Tests.csproj
dotnet build backend/AiTaskDemo.Api.csproj
```

接著執行前端測試與建置：

```powershell
Push-Location frontend
try {
  npm.cmd ci
  npm.cmd test
  npm.cmd run build
} finally {
  Pop-Location
}
```

## API 端點

### 查詢任務

```http
GET /api/tasks
GET /api/tasks?status=Todo
GET /api/tasks?status=Doing
GET /api/tasks?status=Done
```

### 新增任務

```http
POST /api/tasks
```

範例 body：

```json
{
  "title": "Demo task",
  "description": "Verify the flow",
  "status": "Todo"
}
```

成功時回傳 `201 Created`。

### 修改任務狀態

```http
PATCH /api/tasks/{id}/status
```

範例 body：

```json
{
  "status": "Done"
}
```

成功時回傳 `200 OK`。如果任務不存在，回傳 `404 Not Found`。

## 驗證規則

- `title` 必填。
- `title` 不可只有空白。
- `title` 最多 100 個字元。
- `status` 只能是 `Todo`、`Doing`、`Done`。
- 不合法的 `status`，例如 `Blocked`、`99`、`Todo,Doing`，會回傳 `400 Bad Request`。

## SQLite 資料

任務資料會儲存在：

```text
backend/tasks.db
```

後端啟動時會自動建立資料庫檔案。只有在想清空本機測試資料時，才需要手動刪除這個檔案。
