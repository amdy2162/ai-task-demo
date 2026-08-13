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

- 查詢任務列表（支援狀態篩選、分頁導覽、模糊搜尋與動態排序）
  - **分頁導覽 (Pagination)**: 提供「上一頁/下一頁」按鈕、顯示目前頁數、總頁數與任務總筆數，配合後端 SQLite 分頁以確保大數據效能。
  - **模糊搜尋 (Search)**: 輸入關鍵字即時模糊搜尋任務的標題與描述，前端具備 **300ms 防抖 (Debounce)** 機制以防止高頻觸發。
  - **動態排序 (Sorting)**: 支援「建立時間」與「任務標題」排序，並可點擊按鈕自由切換遞增 (▲) 或遞減 (▼) 排序方向。
- 新增任務
- 編輯任務（支援雙介面 **Inline Edit 編輯模式**，可直接修改既有任務的標題與描述並進行長度驗證，支援樂觀更新與 API 失敗回滾）
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
| POST | `/api/auth/register` | 使用者註冊（建立帳號並發行 JWT Token） |
| POST | `/api/auth/login` | 使用者登入（驗證帳密並發行 JWT Token） |
| GET | `/api/auth/me` | 取得當前登入使用者的個人 Profile |
| GET | `/api/tasks` | 查詢個人任務列表（需 JWT Token，支援 `status` 篩選、`search` 模糊搜尋、`sortBy` 排序、`page` 分頁等） |
| POST | `/api/tasks` | 新增個人任務（需 JWT Token） |
| PUT | `/api/tasks/{id}` | 編輯個人任務（需 JWT Token，限擁有者，成功後僅向該使用者廣播 `TaskUpdated`） |
| PATCH | `/api/tasks/{id}/status` | 修改個人任務狀態（需 JWT Token，限擁有者） |
| DELETE | `/api/tasks/{id}` | 刪除個人任務（需 JWT Token，限擁有者） |
| SignalR | `/hubs/tasks` | 即時通訊 Hub（需 JWT Token，僅針對連線使用者廣播 `TaskCreated`, `TaskUpdated`, `TaskDeleted` 事件） |

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

## 🐳 使用 Docker Compose 一鍵啟動（推薦）

專案支援 Docker 容器化，不需在本機安裝 .NET 或 Node.js，只要安裝 Docker 即可一鍵啟動完整系統：

```powershell
# 一鍵建置並啟動前後端容器
docker compose up --build
```

啟動後即可存取：
- **前端 Web 介面 (Nginx)**: `http://localhost:8080`
- **後端 Web API (.NET 10)**: `http://localhost:5000`

若要停止容器：
```powershell
docker compose down
```

## 本機開發啟動方式 (手動)

### 啟動後端

在專案根目錄執行：

```powershell
dotnet restore backend/AiTaskDemo.Api.csproj
dotnet run --project backend/AiTaskDemo.Api.csproj --urls http://localhost:5000
```

後端 API 會啟動在：

```text
http://localhost:5000
```

### 啟動前端

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
   - 執行全部 60 個 xUnit 單元與整合測試並收集程式碼覆蓋率
2. **前端 CI**：
   - 設定 Node.js 22
   - 執行 `npm ci` 安裝套件
   - 執行 59 個 Vitest 單元/元件/Store 測試
   - 執行 `vue-tsc` 型別檢查與 `vite build` 生產建置
   - 安裝 Playwright 瀏覽器並同時執行：
     - **Mock E2E 測試 (`tasks.spec.ts`)**: 使用網路攔截加速測試流程與狀態模擬。
     - **真實 Full Stack E2E 測試 (`tasks.real.spec.ts`)**: 啟動真實背景伺服器與資料庫，進行 100% 真實資料流端到端整合測試。
3. **品質閘門**：任何測試未通過將自動阻擋合併（Block PR merge）。

## SQLite 資料庫與 EF Core Migrations
 
SQLite 資料庫會建立在：

```text
backend/tasks.db
```

後端啟動時會自動透過 `db.Database.Migrate()` 執行最新遷移並建立資料庫檔案。

### EF Core 資料庫遷移常用指令

專案採用 EF Core Migrations 進行資料庫架構版本控制：

- **新增遷移 (Add Migration)**：
  ```powershell
  dotnet ef migrations add <MigrationName> --project backend/AiTaskDemo.Api.csproj --output-dir Migrations
  ```
- **套用遷移至資料庫 (Update Database)**：
  ```powershell
  dotnet ef database update --project backend/AiTaskDemo.Api.csproj
  ```
- **移除上一筆遷移 (Remove Migration)**：
  ```powershell
  dotnet ef migrations remove --project backend/AiTaskDemo.Api.csproj
  ```

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

## Demo 測試流程 (基本功能與即時同步)

1. 啟動後端與前端 (或使用 `docker compose up --build` 啟動)。
2. 開啟兩個**相同使用者帳號**的瀏覽器視窗（或一個 Chrome，一個 Edge 登入同一個帳號）存取 `http://localhost:5173`（驗證多視窗即時同步）。
3. 在一邊新增一筆任務，確認另一邊即時同步顯示。
4. 使用狀態篩選。
5. 在一邊修改任務狀態，確認另一邊即時同步更新。
6. 測試空白 title 與超過 100 字 title 的驗證錯誤。
7. 在一邊刪除任務，確認另一邊即時同步刪除並更新清單。

## 多用戶資料隔離測試說明 (Multi-User Isolation)

為驗證多用戶任務隔離與 SignalR 推播隔離，請依下列步驟操作：

1. **啟動環境**：
   - 執行 `docker compose up --build` 啟動 Docker 容器，或手動啟動本機前後端服務。
2. **開啟兩個不同瀏覽器工作階段**：
   - 開啟 **瀏覽器 A** (例如 Chrome 正常模式) 存取 `http://localhost:5173`。
   - 開啟 **瀏覽器 B** (例如 Chrome 無痕模式/Incognito，或使用另一個瀏覽器如 Firefox) 存取相同網址。
3. **註冊並登入 User A**：
   - 在 **瀏覽器 A** 中，點擊 `Get Started` 並註冊使用者 `UserA`。
   - 登入後，建立一個任務，標題為 `UserA 的私有任務`。
4. **註冊並登入 User B**：
   - 在 **瀏覽器 B** 中，點擊 `Get Started` 並註冊使用者 `UserB`。
   - 登入後，驗證任務清單為空，**確認看不到 User A 建立的 `UserA 的私有任務`** (驗證資料隔離)。
5. **測試即時推播隔離 (SignalR Separation)**：
   - 在 **瀏覽器 A (User A)** 中新增一筆任務或變更任務狀態。
   - 觀察 **瀏覽器 B (User B)**，確認**完全不會收到任何即時更新廣播**（驗證 SignalR 按使用者隔離推播）。
6. **測試非授權存取阻斷**：
   - User B 無法存取 User A 的任務。若企圖透過 API 測試工具 (如 Postman) 帶 User B 的 Token 呼叫 `DELETE /api/tasks/{UserA_Task_Id}`，後端將阻斷並回傳 `404 Not Found`。

## 文件說明

- `README.md`：專案啟動、測試與使用說明
- `SPEC.md`：需求規格與驗收規則
- `ROLES.md`：AI Coding Agent 角色設定與分工說明

---

## 架構決策與 Trade-off 說明

### 為什麼選 SQLite 而非 PostgreSQL？

**決策**：採用 SQLite 作為開發與 Demo 環境的資料庫。

| | SQLite | PostgreSQL |
|---|---|---|
| 部署複雜度 | ✅ 零依賴，隨 App 啟動 | ❌ 需獨立服務、連線設定 |
| Docker 設定 | ✅ 不需額外 container | ❌ 需 `db` service + health check |
| 水平擴展 | ❌ 不支援多實例寫入 | ✅ 支援 Connection Pooling、Replica |
| 生產適用性 | ❌ 單一檔案，不適合高並發 | ✅ 適合生產環境 |

**結論**：SQLite 非常適合 Demo 與開發環境，讓任何人 clone 後立即可跑。EF Core Migrations 的設計讓日後切換至 PostgreSQL 只需更換 Provider 與 Connection String，無需改動業務邏輯。

---

### 為什麼選 SignalR 而非 WebSocket 或 SSE？

**決策**：採用 ASP.NET Core SignalR 處理即時推播。

| | SignalR | 原生 WebSocket | Server-Sent Events (SSE) |
|---|---|---|---|
| 雙向通訊 | ✅ | ✅ | ❌ 單向（Server→Client）|
| 自動降級 | ✅ WebSocket → SSE → Long Polling | ❌ | ❌ |
| 使用者群組管理 | ✅ 內建 `Clients.User()` | ❌ 需自行管理 | ❌ 需自行管理 |
| 與 .NET 整合 | ✅ 原生支援 + JWT | ❌ 需手動解析 | ❌ 需手動解析 |

**結論**：SignalR 提供開箱即用的使用者群組隔離（`Clients.User(userId)`）與自動傳輸降級，大幅降低開發複雜度，且與 .NET 的 JWT 認證系統無縫整合。

---

### 為什麼前端採用 Pinia 而非 Vuex？

**決策**：採用 Pinia 作為前端狀態管理。

- Pinia 是 Vue 3 官方推薦的狀態管理方案，天生支援 Composition API 與 TypeScript。
- 相較 Vuex 4，Pinia 無需 `mutations`，Store 結構更扁平、測試更容易（直接操作 `store.property`）。
- Vitest 整合方便，可用 `setActivePinia(createPinia())` 快速初始化測試環境。

---

### 樂觀更新（Optimistic Update）的設計決策

**決策**：編輯任務時採用樂觀更新策略，並在失敗時自動回滾。

**流程**：
1. 使用者送出編輯 → 前端立即更新 UI（不等待 API 回應）
2. 非同步呼叫 `PUT /api/tasks/{id}`
3. ✅ 成功：保持 UI 狀態，SignalR 廣播確認
4. ❌ 失敗：自動回滾至原始資料，顯示錯誤通知

**Trade-off**：在網路延遲高的情況下改善使用者體驗；代價是需要在 Store 中暫存原始資料，並處理競態條件（Race Condition）。

---

## 已知限制與未來擴展方向

### 目前的限制

| 限制 | 說明 |
|---|---|
| **SignalR 無法水平擴展** | 目前採用 In-Memory 連線管理，部署多台 Server 時無法共享連線狀態。需引入 **Redis Backplane** (`AddStackExchangeRedis`) 才能支援 Scale-out。 |
| **SQLite 單點寫入** | SQLite 的 WAL 模式雖支援並發讀取，但高並發寫入仍有效能瓶頸，生產環境建議替換為 PostgreSQL。 |
| **JWT 無吊銷機制** | 目前 JWT Token 一旦發行，在有效期內無法強制失效（如使用者登出後 Token 仍有效）。可用 Redis 實作 Token Blacklist 解決。 |
| **無 Rate Limiting** | API 目前無請求頻率限制，可能遭受暴力破解或 DDoS。可用 ASP.NET Core 的 `AddRateLimiter` 加入保護。 |
| **無結構化日誌** | 目前使用預設的 `ILogger`，生產環境建議整合 **Serilog** 輸出 JSON 結構化日誌，配合 ELK Stack 或 Azure Application Insights 做可觀測性。 |
| **密碼無複雜度驗證** | 目前只驗證長度 ≥ 6，生產環境應加入複雜度規則（大小寫、數字、特殊字元）。 |

### 如果要上生產環境，會加入

1. **PostgreSQL + Redis**：替換資料庫、啟用 SignalR Scale-out
2. **Serilog + OpenTelemetry**：結構化日誌 + Distributed Tracing
3. **Rate Limiting + CORS 嚴格設定**：API 安全加固
4. **Refresh Token 機制**：解決 JWT 短效與長效 Token 的平衡問題
5. **HTTPS + 環境變數管理**：透過 Azure Key Vault 或 `.env` 管理 Secret
6. **前端 Bundle 分析 + CDN**：Vite 的 `rollup-plugin-visualizer` + 靜態資源 CDN 加速
