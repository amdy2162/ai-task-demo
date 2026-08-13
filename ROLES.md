# AI Coding Agent 角色設定

本文件說明此專案在開發過程中如何設定與使用不同 AI Coding Agent 角色，讓面試官可以理解需求分析、開發、Code Review 與測試驗收的分工方式。

## 角色總覽

| 角色 | 主要責任 | 主要產出 |
| --- | --- | --- |
| PM | 釐清需求、拆解功能、定義驗收標準 | `SPEC.md`、開發計畫、Acceptance Criteria |
| 全端工程師 | 設計前後端整合方式、實作 API 與資料流程 | ASP.NET Core API、Vue 串接、整合測試 |
| 前端工程師 | 實作使用者介面與前端狀態管理 | Vue 3 UI、Pinia Store、前端測試 |
| QA | 驗證功能、邊界條件與錯誤處理 | 測試案例、測試結果、缺陷回饋 |

## 共用原則

所有角色都必須遵守以下原則：

- 先閱讀 `SPEC.md` 與既有程式碼，再提出修改建議。
- 不憑空新增需求，所有實作必須對應需求或驗收標準。
- 每次修改都要能說明目的、影響範圍與驗證方式。
- 發現需求不清楚時，優先提出問題或列出假設。
- Code Review 必須指出具體檔案、具體問題與建議修正方式。

## PM 角色設定

### 角色定位

PM 負責把使用者需求整理成可開發、可驗收的規格，避免工程師直接從模糊描述開始寫程式。

### 責任

- 整理功能需求。
- 定義資料欄位與限制。
- 定義 API 行為。
- 拆解開發任務。
- 定義 Acceptance Criteria。
- 確認開發結果是否符合原始需求。

### Prompt 設定範例

```text
你是此專案的 PM。
請先閱讀 SPEC.md 與目前專案結構，將需求拆解成可執行的開發任務。
每個任務都要包含：
1. 目標
2. 修改範圍
3. 驗收標準
4. 可能風險

請不要直接修改程式碼。
如果需求不清楚，請列出問題與合理假設。
```

### 本專案中的 PM 產出

- 確認任務管理系統需要支援查詢、新增、狀態修改與狀態篩選。
- 定義 Task 欄位：`id`、`title`、`description`、`status`、`createdAt`。
- 定義驗證規則：`title` 必填、最多 100 字、`status` 只能是 `Todo`、`Doing`、`Done`。
- 定義使用者身分驗證與多用戶任務隔離規則（包含密碼強度至少 6 字元、用戶名唯一性、SignalR 定向推播）。
- 將開發流程拆成後端、前端、測試與文件階段。

## 全端工程師角色設定

### 角色定位

全端工程師負責確保前端、後端、資料庫與 API Contract 能完整串接。

### 責任

- 設計 RESTful API。
- 實作 ASP.NET Core Controller、Service、DTO、Model。
- 實作 `PUT /api/tasks/{id}` 編輯任務端點與 `TaskService` EF Core 查詢擴充（支援 `search` 模糊比對、`sortBy` / `sortOrder` 動態排序）。
- 實作 `GlobalExceptionMiddleware` 處理全域例外與 RFC 7807 `ProblemDetails` 回應格式。
- 實作 SignalR `TaskHub` (`/hubs/tasks`) 並於任務 CRUD 異動時廣播 `TaskCreated`、`TaskUpdated`、`TaskDeleted` 事件。
- 使用 Entity Framework Core 與 SQLite 儲存資料。
- 確認前端 TypeScript 型別與後端 JSON Contract 一致。
- 處理 CORS、錯誤回應與資料驗證。
- 執行整合測試與建置驗證。

### Prompt 設定範例

```text
你是此專案的全端工程師。
請根據 SPEC.md 實作前後端整合。

後端使用 ASP.NET Core Web API、SignalR Hub、Entity Framework Core、SQLite。
前端使用 Vue 3、TypeScript、Pinia、Vite。

請確保：
1. API 符合 RESTful Design 且 Hub 事件正確廣播
2. 前後端型別與事件名稱一致
3. 驗證錯誤回傳 400
4. 未捕捉例外傳回 RFC 7807 格式 500 回應
5. 程式碼可建置並可測試
```

### 本專案中的全端工程師產出

- 建立 `/api/tasks` 查詢、狀態篩選、`search` 模糊搜尋與 `sortBy`/`sortOrder` 動態排序 API。
- 建立 `/api/tasks` 新增 API。
- 建立 `/api/tasks/{id}` (PUT) 編輯任務 API（更新標題、描述與狀態）。
- 建立 `/api/tasks/{id}/status` 狀態修改 API。
- 建立 `/api/tasks/{id}` 刪除任務 API。
- 建立 `GlobalExceptionMiddleware` 統一傳回 RFC 7807 `application/problem+json` 格式錯誤回應。
- 建立 SQLite 資料儲存與 EF Core DbContext。
- 實作 JWT Token 簽署服務 (`JwtTokenService`) 與密碼雜湊驗證服務 (`AuthService`)。
- 建立註冊、登入與查詢當前登入者 API 端點 (`POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`)。
- 為所有任務 API 與 SignalR Hub 配置 `[Authorize]` 防護，並修改資料儲存邏輯綁定 `UserId` 外鍵，實作多用戶隔離。
- 建立 `TaskHub` (`/hubs/tasks`)，並限制 SignalR 即時推播僅傳送至任務擁有者 (`Clients.User(userId)`)，而非全體廣播。
- 確認前端 `taskApi.ts` 與後端 API 路徑一致。
- 驗證 API 回傳格式符合前端 `Task` 及 `Auth` 型別。

## 前端工程師角色設定

### 角色定位

前端工程師負責讓使用者能透過畫面完成任務管理操作，並確保狀態與錯誤訊息清楚。

### 責任

- 建立 Vue 3 使用者介面。
- 使用 TypeScript 定義 Task 型別。
- 使用 Pinia 管理任務列表、載入狀態、錯誤狀態與篩選條件。
- 串接後端 API 與 `@microsoft/signalr` 即時連線服務。
- 管理即時連線生命週期（`startRealtime` / `stopRealtime`）與連線狀態指示燈。
- 實作 title 驗證與錯誤提示。
- 實作刪除任務按鈕與狀態更新。
- 撰寫前端元件測試、Store 測試與 SignalR 服務測試。

### Prompt 設定範例

```text
你是此專案的前端工程師。
請根據 SPEC.md 與後端 API Contract 實作 Vue 3 前端。

請完成：
1. 任務列表與看板檢視
2. 新增任務表單
3. 狀態篩選
4. 任務狀態修改
5. 刪除任務按鈕與操作
6. title 必填與 100 字限制提示
7. `@microsoft/signalr` 即時連線與 Pinia 即時同步監聽

請使用 TypeScript、Pinia 與 Vite。
修改後請補上必要測試。
```

### 本專案中的前端工程師產出

- 建立 `src/types/task.ts` 與 `src/types/auth.ts` 定義任務與驗證資料型別。
- 建立 `src/api/taskApi.ts` 與 `src/api/authApi.ts` 封裝 API 呼叫與驗證串接。
- 實作 Axios 請求攔截器自動帶入 `Authorization` Bearer 憑證，以及回應攔截器監聽 401 自動登出。
- 建立 `src/services/signalrService.ts` 封裝 SignalR 連線（動態獲取 Token）與事件訂閱。
- 建立 `src/stores/authStore.ts` 管理登入狀態、User 資訊並儲存於 LocalStorage；建立 `taskStore.ts` 管理任務狀態並配合登入狀態自動重啟即時連線。
- 建立 `AuthModal.vue` 提供身分驗證視窗（支援登入/註冊分頁切換、欄位驗證、錯誤提示）。
- 修改 `src/App.vue` 提供未登入引導卡片、首頁登入/註冊按鈕、登入歡迎資訊、登出機制與即時連線狀態燈號（Live Sync）。
- 加入前端測試驗證主要操作流程、驗證狀態商店與即時連線服務。

## QA 角色設定

### 角色定位

QA 負責從驗收標準與使用者操作角度檢查功能是否正確，而不是只確認程式能執行。

### 責任

- 根據 Acceptance Criteria 建立測試案例。
- 驗證正常流程。
- 驗證錯誤流程與邊界條件。
- 驗證多視窗/多裝置即時同步與連線生命週期。
- 驗證 `PUT` 編輯、`search` 模糊搜尋與 `sortBy` / `sortOrder` 動態排序功能。
- 驗證全域例外處理 RFC 7807 錯誤格式。
- 檢查 API 回應狀態碼與 SignalR 廣播事件。
- 檢查前端畫面是否正確呈現成功與錯誤狀態。
- 回報缺陷並提供可重現步驟。

### Prompt 設定範例

```text
你是此專案的 QA。
請根據 SPEC.md 與 Acceptance Criteria 設計測試案例。

請至少驗證：
1. 可以新增 Task
2. 可以查詢 Task
3. 可以修改 Task 狀態
4. 可以依 Status 篩選
5. 可以刪除 Task
6. 空白 title 不允許新增
7. title 超過 100 字回傳 400
8. status 不是 Todo / Doing / Done 時回傳錯誤
9. 開啟多個視窗操作，新增/修改/刪除任務時其他視窗無需重新整理即時同步
10. 可以透過 PUT /api/tasks/{id} 編輯 Task 標題、描述與狀態
11. 可以透過 search 參數對標題與描述進行關鍵字模糊搜尋
12. 可以透過 sortBy 與 sortOrder 進行動態排序
13. 伺服器端發生未預期例外時，統一回傳 RFC 7807 ProblemDetails 格式

請輸出測試清單、預期結果與實際結果。
```

### 本專案中的 QA 驗收重點

| 測試項目 | 預期結果 |
| --- | --- |
| 新增合法 Task | 回傳新增後的 Task，列表出現該任務 |
| 查詢 Task | 回傳任務列表 |
| 修改狀態為 `Doing` | 任務狀態成功更新 |
| 篩選 `Todo` | 只顯示 `Todo` 任務 |
| 刪除 Task | `DELETE /api/tasks/{id}` 回傳 204，任務從列表移除；若不存在回傳 404 |
| PUT 編輯 Task | `PUT /api/tasks/{id}` 更新成功回傳 200 與更新後 Task，並廣播 `TaskUpdated`；不存在回傳 404 |
| 關鍵字模糊搜尋 (search) | `GET /api/tasks?search=kw` 僅傳回標題或描述包含 `kw` 之任務 |
| 動態排序 (sortBy, sortOrder) | `GET /api/tasks?sortBy=title&sortOrder=asc` 依指定欄位與方向正確排序 |
| 全域例外處理 (RFC 7807) | 伺服器發生未預期例外時傳回 500，Content-Type 為 `application/problem+json` 且符合 RFC 7807 結構 |
| 空白 title | 前端阻擋或後端回傳 `400 Bad Request` |
| title 超過 100 字 | 後端回傳 `400 Bad Request` |
| status 傳入非法值 | 後端回傳 `400 Bad Request` |
| 多視窗新增 Task | 視窗 A 新增任務，視窗 B 無需重新整理即時出現該任務 |
| 多視窗修改 Task 狀態 | 視窗 A 修改任務狀態，視窗 B 即時同步更新該任務狀態 |
| 多視窗刪除 Task | 視窗 A 刪除任務，視窗 B 即時同步移除該任務 |
| 使用者註冊成功 | `POST /api/auth/register` 傳回 201 Created 與包含 Token 的 `AuthResponse` |
| 使用者註冊帳號重複 | `POST /api/auth/register` 傳回 409 Conflict，確保帳號唯一性 |
| 使用者登入成功 | `POST /api/auth/login` 傳回 200 OK 與 Token，前端自動儲存並引導至主畫面 |
| 使用者登入密碼錯誤 | `POST /api/auth/login` 傳回 401 Unauthorized |
| 未登入存取受保護 API | 各個任務相關 API 傳回 401 Unauthorized，前端自動執行登出並引導回登入頁 |
| 多用戶任務列表隔離 | 使用者 B 呼叫 `GET /api/tasks` 只能取得自己建立的任務，確認無法檢視使用者 A 的任務 |
| 多用戶任務異動阻斷 | 使用者 B 企圖呼叫 `PUT` 或 `DELETE` 異動使用者 A 的任務時，後端阻斷並回傳 404 Not Found |
| 即時通訊隔離 | 使用者 A 對任務進行新增/修改/刪除時，僅有使用者 A 連線的視窗會透過 SignalR 收到即時更新廣播，使用者 B 不會收到任何廣播 |

## 角色協作流程

```text
需求輸入
  ↓
PM：整理需求與驗收標準
  ↓
全端工程師：設計 API、資料模型與整合方式
  ↓
前端工程師：實作 UI、Store 與 API 串接
  ↓
QA：依驗收標準測試正常流程與錯誤流程
  ↓
工程師：根據 QA / Code Review 回饋修正
  ↓
文件整理：更新 README、SPEC 與角色設定文件
```
