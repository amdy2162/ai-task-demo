# JWT Authentication & Multi-User Task Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 為專案建置完整的 **JWT 身分驗證 (JWT Authentication) 與多用戶任務隔離機制 (Multi-User Task Isolation)**，讓使用者能夠註冊、登入，並確保每個使用者只能檢視與管理屬於自己的任務，同時升級 SignalR 即時推播為依使用者精準推播。

**Architecture:** 
1. **後端認證與授權 (Backend Auth)**：引入 `Microsoft.AspNetCore.Authentication.JwtBearer`，建立 `User` 資料模型與安全密碼雜湊，實作 `POST /api/auth/register`、`POST /api/auth/login`、`GET /api/auth/me`。
2. **多用戶資料隔離 (Multi-Tenant Isolation)**：在 `TaskItem` 加入 `UserId` 外鍵，所有 CRUD 操作自動透過 HttpContext Claims 限制在當前登入者；SignalR 改為依使用者推播 (`Clients.User(userId)`)。
3. **前端身分管理與 UI (Frontend Auth)**：建立 `authStore.ts`、Axios 請求攔截器 (自動附帶 `Bearer <token>`)、`AuthModal.vue` 登入/註冊彈窗，以及 SignalR JWT 憑證連線。

**Tech Stack:** ASP.NET Core 10, JWT Bearer Token, EF Core 10 Migrations, Vue 3, Pinia, Axios Interceptors, Vitest, Playwright, xUnit.

---

### Task 1: Backend JWT Infrastructure, User Model & Auth APIs

**Files:**
- Modify: `backend/AiTaskDemo.Api.csproj`
- Create: `backend/Models/User.cs`
- Modify: `backend/Data/AppDbContext.cs`
- Create: `backend/DTOs/AuthDtos.cs`
- Create: `backend/Services/JwtTokenService.cs`
- Create: `backend/Services/AuthService.cs`
- Create: `backend/Controllers/AuthController.cs`
- Modify: `backend/Program.cs`
- Create: `backend/Migrations/YYYYMMDD_AddUserAndAuth.cs`
- Test: `backend.tests/AuthApiTests.cs`

- [ ] **Step 1: Add JwtBearer package to backend csproj**

In `backend/AiTaskDemo.Api.csproj`:
```xml
<PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="10.0.10" />
```

- [ ] **Step 2: Create User model in backend/Models/User.cs**

```csharp
namespace AiTaskDemo.Api.Models;

public sealed class User
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
}
```

- [ ] **Step 3: Register User in AppDbContext.cs and configure uniqueness**

In `backend/Data/AppDbContext.cs`:
```csharp
public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<TaskItem> Tasks => Set<TaskItem>();
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Username)
            .IsUnique();
    }
}
```

- [ ] **Step 4: Create Auth DTOs in backend/DTOs/AuthDtos.cs**

```csharp
using System.ComponentModel.DataAnnotations;

namespace AiTaskDemo.Api.DTOs;

public sealed record RegisterRequest(
    [param: Required, MinLength(3), MaxLength(30)] string Username,
    [param: Required, MinLength(6), MaxLength(100)] string Password);

public sealed record LoginRequest(
    [param: Required] string Username,
    [param: Required] string Password);

public sealed record AuthResponse(
    string Token,
    int UserId,
    string Username);

public sealed record UserProfileResponse(
    int Id,
    string Username,
    DateTime CreatedAt);
```

- [ ] **Step 5: Implement JwtTokenService & AuthService**

In `backend/Services/JwtTokenService.cs`:
- Generate signed HMAC-SHA256 JWT tokens containing `ClaimTypes.NameIdentifier` (`userId`) and `ClaimTypes.Name` (`username`).

In `backend/Services/AuthService.cs`:
- Secure password hashing using `Microsoft.AspNetCore.Identity.PasswordHasher<User>`.
- Register logic checking for unique username.
- Login logic verifying hashed password.

- [ ] **Step 6: Implement AuthController.cs**

Endpoints:
- `POST /api/auth/register` (returns 201 with `AuthResponse`)
- `POST /api/auth/login` (returns 200 with `AuthResponse` or 401 on invalid credentials)
- `GET /api/auth/me` (requires `[Authorize]`, returns `UserProfileResponse`)

- [ ] **Step 7: Configure JWT Authentication in Program.cs**

In `backend/Program.cs`:
- Configure `AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(...)`
- Support SignalR WebSocket query token (`access_token` in query string for `/hubs/tasks`)
- Add `app.UseAuthentication()` before `app.UseAuthorization()`

- [ ] **Step 8: Write xUnit tests for Auth APIs in backend.tests/AuthApiTests.cs**

Test scenarios:
- Successful user registration returns token and user profile
- Registration with duplicate username returns 409 Conflict
- Registration with short password/username returns 400 ValidationProblem
- Successful login returns valid JWT token
- Login with invalid password returns 401 Unauthorized
- Calling `GET /api/auth/me` without token returns 401 Unauthorized
- Calling `GET /api/auth/me` with valid token returns current user data

- [ ] **Step 9: Run tests and create EF Core Migration**

```bash
dotnet ef migrations add AddUserAndAuth --project backend/AiTaskDemo.Api.csproj --output-dir Migrations
dotnet test backend.tests/AiTaskDemo.Api.Tests.csproj --filter "FullyQualifiedName~Auth"
```

- [ ] **Step 10: Commit Task 1**

```bash
git add backend/ backend.tests/
git commit -m "feat(auth): implement JWT authentication, user registration, login, and integration tests"
```

---

### Task 2: Multi-User Task Ownership & SignalR Targeted Push

**Files:**
- Modify: `backend/Models/TaskItem.cs`
- Modify: `backend/Services/TaskService.cs`
- Modify: `backend/Controllers/TasksController.cs`
- Modify: `backend/Hubs/TaskHub.cs`
- Create: `backend/Migrations/YYYYMMDD_AddTaskUserIdForeignKey.cs`
- Test: `backend.tests/TasksApiTests.cs`

- [ ] **Step 1: Add UserId foreign key to TaskItem model**

In `backend/Models/TaskItem.cs`:
```csharp
public int UserId { get; set; }
public User? User { get; set; }
```

- [ ] **Step 2: Update TaskService.cs to scope all operations by userId**

- `CreateAsync(int userId, ...)`
- `GetPagedAsync(int userId, ...)` -> `query.Where(item => item.UserId == userId)`
- `UpdateAsync(int id, int userId, ...)` -> returns false if task does not belong to user
- `UpdateStatusAsync(int id, int userId, ...)`
- `DeleteAsync(int id, int userId, ...)`

- [ ] **Step 3: Update TasksController.cs with [Authorize] and current user extraction**

- Add `[Authorize]` to `TasksController`.
- Helper method `private int GetCurrentUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);`
- When broadcasting SignalR events, broadcast to specific user:
  ```csharp
  await hubContext.Clients.User(userId.ToString()).SendAsync("TaskCreated", response);
  ```

- [ ] **Step 4: Update TaskHub.cs with [Authorize]**

In `backend/Hubs/TaskHub.cs`:
- Add `[Authorize]` attribute to ensure only authenticated users can connect.

- [ ] **Step 5: Write multi-user isolation integration tests in backend.tests/TasksApiTests.cs**

Test scenarios:
- User A creates a task -> User A can see it.
- User B lists tasks -> User B cannot see User A's task.
- User B attempts to edit or delete User A's task -> returns 404 Not Found.
- SignalR events only reach the owner of the task.

- [ ] **Step 6: Run all backend tests**

Run: `dotnet test backend.tests/AiTaskDemo.Api.Tests.csproj`
Expected: All tests pass.

- [ ] **Step 7: Commit Task 2**

```bash
git add backend/ backend.tests/
git commit -m "feat(backend): implement multi-user task ownership isolation and targeted SignalR push"
```

---

### Task 3: Frontend Auth Store, Axios Interceptors & Auth UI

**Files:**
- Create: `frontend/src/types/auth.ts`
- Create: `frontend/src/api/authApi.ts`
- Modify: `frontend/src/api/taskApi.ts`
- Create: `frontend/src/stores/authStore.ts`
- Modify: `frontend/src/services/signalrService.ts`
- Create: `frontend/src/components/AuthModal.vue`
- Modify: `frontend/src/App.vue`
- Test: `frontend/tests/authStore.spec.ts`
- Test: `frontend/tests/AuthModal.spec.ts`

- [ ] **Step 1: Define Auth types in frontend/src/types/auth.ts**

```typescript
export interface UserInfo {
  id: number
  username: string
}

export interface AuthResponse {
  token: string
  userId: number
  username: string
}

export interface UserProfile {
  id: number
  username: string
  createdAt: string
}
```

- [ ] **Step 2: Create authApi.ts and Axios Interceptors**

In `frontend/src/api/taskApi.ts` / `frontend/src/api/authApi.ts`:
- Attach request interceptor: automatically set `Authorization: Bearer ${token}` from `localStorage`.
- Attach response interceptor: on 401 Unauthorized, automatically trigger logout in `authStore`.

- [ ] **Step 3: Implement authStore.ts**

State:
- `token`: ref string from `localStorage.getItem('auth_token')`
- `user`: ref `UserInfo | null`
- `isAuthenticated`: computed boolean
- Actions: `register(username, password)`, `login(username, password)`, `logout()`, `fetchMe()`

- [ ] **Step 4: Update signalrService.ts with JWT token provider**

In `frontend/src/services/signalrService.ts`:
```typescript
.withUrl(`${hubUrl}`, {
  accessTokenFactory: () => localStorage.getItem('auth_token') || '',
})
```

- [ ] **Step 5: Create AuthModal.vue component**

- Dual-tab design: "Login" and "Register".
- Input fields: Username and Password with instant validation.
- Error banner for invalid credentials or duplicate usernames.
- Close button and modal backdrop.

- [ ] **Step 6: Integrate Auth in App.vue**

- Header user section:
  - If authenticated: Displays `👤 {username}` and `[Logout]` button.
  - If not authenticated: Displays `[Login / Register]` button and empty state encouraging login.
- When user logs in or out, automatically restarts SignalR connection with new credentials and refreshes task list.

- [ ] **Step 7: Write unit tests for authStore and AuthModal**

Run: `npm test -- tests/authStore.spec.ts tests/AuthModal.spec.ts`
Expected: All pass.

- [ ] **Step 8: Commit Task 3**

```bash
git add frontend/
git commit -m "feat(frontend): create authStore, Axios interceptors, AuthModal UI, and SignalR auth token integration"
```

---

### Task 4: Full-Suite Verification & Documentation

**Files:**
- Modify: `frontend/e2e/tasks.spec.ts`
- Modify: `SPEC.md`
- Modify: `README.md`
- Modify: `ROLES.md`

- [ ] **Step 1: Update Playwright E2E test suite in frontend/e2e/tasks.spec.ts**
  - Add test for user login flow and personal task management.
  - Run `npm run test:e2e` to verify.

- [ ] **Step 2: Update SPEC.md**
  - Document Auth APIs (`/api/auth/register`, `/api/auth/login`, `/api/auth/me`).
  - Document multi-user data isolation and authorization acceptance criteria.

- [ ] **Step 3: Update README.md**
  - Update API endpoint tables.
  - Add demo guide for multi-user testing (e.g. testing with two different user accounts in separate browser windows).

- [ ] **Step 4: Execute full test verification across the entire project**

Run:
```powershell
dotnet test backend.tests/AiTaskDemo.Api.Tests.csproj
cd frontend
npm test
npm run test:e2e
npm run build
```

- [ ] **Step 5: Commit Task 4**

```bash
git add SPEC.md README.md ROLES.md frontend/e2e/ docs/superpowers/plans/2026-08-12-jwt-authentication-and-multi-user.md
git commit -m "docs: update specifications and test suites for JWT auth and multi-user isolation"
```
