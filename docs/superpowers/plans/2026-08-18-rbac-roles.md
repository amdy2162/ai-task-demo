# RBAC 角色權限控制實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目標 (Goal):** 在任務管理系統中實作 Admin、Editor 與 Viewer 角色，並根據使用者的角色來強制執行資料存取與修改的權限控制。

**架構 (Architecture):** 在 `User` 模型中新增 `UserRole` 列舉，將角色資訊包含在 JWT 的聲明 (Claims) 中，使用 ASP.NET Core 的 `[Authorize]` 屬性在控制器 (Controllers) 進行角色檢查，並在 `TaskService` 處理細部權限控制 (Admin 可存取所有任務，Editor 只能存取自己的任務)。

**技術棧 (Tech Stack):** ASP.NET Core Web API, Entity Framework Core, SQLite, JWT.

---

### Task 1: 新增 UserRole 模型與 EF 遷移 (Migration)

**修改檔案:**
- 建立: `backend/Models/UserRole.cs`
- 修改: `backend/Models/User.cs:4-16`

- [ ] **Step 1: 建立 UserRole 列舉 (enum)**

```csharp
// backend/Models/UserRole.cs
namespace AiTaskDemo.Api.Models;

public enum UserRole
{
    Viewer,
    Editor,
    Admin
}
```

- [ ] **Step 2: 在 User 新增 Role 屬性**

修改 `backend/Models/User.cs`：

```csharp
using System;
using System.Collections.Generic;

namespace AiTaskDemo.Api.Models;

public sealed class User
{
    public int Id { get; set; }
    public required string Username { get; set; }
    public required string PasswordHash { get; set; }
    public DateTime CreatedAt { get; set; }
    public UserRole Role { get; set; } = UserRole.Viewer;

    // Navigation property
    public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
}
```

- [ ] **Step 3: 產生 EF 遷移檔案**

執行: `cd backend && dotnet ef migrations add AddUserRole`
預期結果: PASS 並顯示 "Done. To undo this action, use 'ef migrations remove'."

### Task 2: 將角色資訊加入 JWT 與 API 回應中

**修改檔案:**
- 修改: `backend/Services/JwtTokenService.cs:19-24`
- 修改: `backend/DTOs/AuthDtos.cs:14-18`
- 修改: `backend/Services/AuthService.cs:35-37` 與 `53-55` 與 `64-66`

- [ ] **Step 1: 在 JWT Claims 中加入 Role**

修改 `backend/Services/JwtTokenService.cs` 約第 19 行處：

```csharp
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Role, user.Role.ToString())
        };
```

- [ ] **Step 2: 在 UserProfileResponse 加入 Role**

修改 `backend/DTOs/AuthDtos.cs` 約第 14 行處：

```csharp
public sealed record UserProfileResponse(
    int Id,
    string Username,
    DateTime CreatedAt,
    string Role);
```

- [ ] **Step 3: 更新 AuthService 以對應 Role**

修改 `backend/Services/AuthService.cs` 所有實例化 `UserProfileResponse` 的地方 (共三處: `RegisterAsync`, `LoginAsync`, `GetUserProfileAsync`)：

```csharp
        return new AuthResponse(token, new UserProfileResponse(user.Id, user.Username, user.CreatedAt, user.Role.ToString()));
```

```csharp
        return new AuthResponse(token, new UserProfileResponse(user.Id, user.Username, user.CreatedAt, user.Role.ToString()));
```

```csharp
        return new UserProfileResponse(user.Id, user.Username, user.CreatedAt, user.Role.ToString());
```

### Task 3: 在 Controllers 與 Services 強制執行角色檢查

**修改檔案:**
- 修改: `backend/Controllers/TasksController.cs`
- 修改: `backend/Services/TaskService.cs`

- [ ] **Step 1: 在 TasksController 提取 Role**

修改 `backend/Controllers/TasksController.cs` 新增 `GetCurrentUserRole` 方法：

```csharp
    private int GetCurrentUserId()
    {
        var nameId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        return int.Parse(nameId ?? throw new InvalidOperationException("User ID claim not found."));
    }

    private string GetCurrentUserRole()
    {
        return User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? string.Empty;
    }
```

- [ ] **Step 2: 限制 POST, PUT, PATCH, DELETE 只有 Admin 和 Editor 可以存取**

在 `backend/Controllers/TasksController.cs` 中，將 `[Authorize(Roles = "Admin,Editor")]` 加到 `Create`, `Update`, `UpdateStatus`, 和 `Delete` 端點上方：

```csharp
    [HttpPost]
    [Authorize(Roles = "Admin,Editor")]
    public async Task<ActionResult<TaskResponse>> Create(
```
```csharp
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,Editor")]
    public async Task<ActionResult<TaskResponse>> Update(
```
```csharp
    [HttpPatch("{id:int}/status")]
    [Authorize(Roles = "Admin,Editor")]
    public async Task<ActionResult<TaskResponse>> UpdateStatus(
```
```csharp
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin,Editor")]
    public async Task<IActionResult> Delete(
```

- [ ] **Step 3: 更新 TasksController 方法以傳遞 Role**

在 `TasksController.cs` 中所有呼叫 `TaskService` 的方法，傳入 `GetCurrentUserRole()` 作為新參數 (例如: `var userRole = GetCurrentUserRole();`)。

```csharp
        var userId = GetCurrentUserId();
        var userRole = GetCurrentUserRole();
        var (items, totalCount) = await service.GetPagedAsync(taskStatus, search, sortBy, sortOrder, page, pageSize, userId, userRole, cancellationToken);
```
*(在 `UpdateAsync`, `UpdateStatusAsync` 和 `DeleteAsync` 也套用相同的更新。`CreateAsync` 不需要檢查角色，因為它只是為當前使用者建立新紀錄。)*

- [ ] **Step 4: 在 TaskService 實作細部存取控制**

修改 `backend/Services/TaskService.cs`。在 `GetPagedAsync`, `UpdateStatusAsync`, `UpdateAsync` 和 `DeleteAsync` 加上 `string userRole` 參數。

針對 `GetPagedAsync`：
```csharp
    public async Task<(List<TaskItem> Items, int TotalCount)> GetPagedAsync(
        TaskState? status, string? search, string? sortBy, string? sortOrder,
        int page, int pageSize, int userId, string userRole, CancellationToken cancellationToken)
    {
        var query = db.Tasks.AsNoTracking();
        if (userRole != UserRole.Admin.ToString())
        {
            query = query.Where(item => item.UserId == userId);
        }
// ...
```

針對 `UpdateStatusAsync`, `UpdateAsync`, `DeleteAsync`：
```csharp
    public async Task<TaskItem?> UpdateStatusAsync(
        int id, TaskState status, int userId, string userRole, CancellationToken cancellationToken)
    {
        var item = await db.Tasks.FindAsync([id], cancellationToken);
        if (item is null || (userRole != UserRole.Admin.ToString() && item.UserId != userId))
        {
            return null;
        }
// ...
```
*(將完全相同的 `if` 檢查套用到 `UpdateAsync` 和 `DeleteAsync`)*

- [ ] **Step 5: 執行測試 / 建置**

執行: `dotnet build backend`
預期結果: PASS with 0 Errors.
