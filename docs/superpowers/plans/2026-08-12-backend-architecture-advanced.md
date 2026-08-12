# Backend Architecture & EF Core Advanced Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 強化 ASP.NET Core 後端架構與 EF Core 查詢能力，新增任務完整編輯 (`PUT /api/tasks/{id}`)、關鍵字模糊搜尋 (`search`)、動態排序 (`sortBy`, `sortOrder`)、全域例外處理中介軟體 (Global Exception Handling with RFC 7807 ProblemDetails)，以及完整後端自動化測試與文件更新。

**Architecture:** 在 `TaskDtos.cs` 擴充 `UpdateTaskRequest` 與 `TaskQueryParameters`；在 `TaskService.cs` 透過 EF Core `IQueryable` 鏈式組合支援多條件過濾與動態排序；在 `TasksController.cs` 實作 `PUT /api/tasks/{id}` 並透過 SignalR 廣播 `TaskUpdated`；新增 `GlobalExceptionHandlerMiddleware` 提供統一錯誤回應；並透過 xUnit 進行全覆蓋整合測試。

**Tech Stack:** ASP.NET Core Web API, Entity Framework Core, SQLite, SignalR, xUnit, WebApplicationFactory.

---

### Task 1: Full Task Update (`PUT /api/tasks/{id}`) Endpoint & Tests

**Files:**
- Modify: `backend/DTOs/TaskDtos.cs`
- Modify: `backend/Services/TaskService.cs`
- Modify: `backend/Controllers/TasksController.cs`
- Test: `backend.tests/TasksApiTests.cs`

- [ ] **Step 1: Write failing backend integration tests for PUT endpoint**

In `backend.tests/TasksApiTests.cs`, add:
```csharp
    [Fact]
    public async Task Put_updates_task_fields_and_persists()
    {
        await SeedAsync(NewItem("Original Title", TaskState.Todo, DateTime.UtcNow));
        int id;
        using (var scope = factory.Services.CreateScope())
        {
            id = scope.ServiceProvider.GetRequiredService<AppDbContext>().Tasks.Single().Id;
        }

        var response = await factory.CreateClient().PutAsJsonAsync($"/api/tasks/{id}", new
        {
            title = "Updated Title",
            description = "Updated Description",
            status = "Doing"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var item = await response.Content.ReadFromJsonAsync<TaskResponse>(JsonOptions);
        Assert.Equal("Updated Title", item!.Title);
        Assert.Equal("Updated Description", item.Description);
        Assert.Equal(TaskState.Doing, item.Status);

        using var verifyScope = factory.Services.CreateScope();
        var persisted = await verifyScope.ServiceProvider.GetRequiredService<AppDbContext>()
            .Tasks.AsNoTracking().SingleAsync(task => task.Id == id);
        Assert.Equal("Updated Title", persisted.Title);
        Assert.Equal("Updated Description", persisted.Description);
        Assert.Equal(TaskState.Doing, persisted.Status);
    }

    [Fact]
    public async Task Put_returns_not_found_for_unknown_id()
    {
        var response = await factory.CreateClient().PutAsJsonAsync("/api/tasks/99999", new
        {
            title = "Valid Title",
            description = "Valid Description",
            status = "Todo"
        });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Put_rejects_blank_title(string title)
    {
        var response = await factory.CreateClient().PutAsJsonAsync("/api/tasks/1", new
        {
            title,
            description = "Some description",
            status = "Todo"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `dotnet test backend.tests/AiTaskDemo.Api.Tests.csproj --filter "FullyQualifiedName~Put_"`
Expected: FAIL with `405 Method Not Allowed` or `404 Not Found`.

- [ ] **Step 3: Implement UpdateTaskRequest DTO, TaskService.UpdateAsync, and TasksController.Update**

In `backend/DTOs/TaskDtos.cs`, add `UpdateTaskRequest`:
```csharp
public sealed record UpdateTaskRequest(
    [param: Required, MaxLength(100)] string? Title,
    string? Description,
    TaskState? Status);
```

In `backend/Services/TaskService.cs`, add `UpdateAsync`:
```csharp
    public async Task<TaskItem?> UpdateAsync(
        int id,
        string title,
        string? description,
        TaskState status,
        CancellationToken cancellationToken)
    {
        var item = await db.Tasks.FindAsync([id], cancellationToken);
        if (item is null)
        {
            return null;
        }

        item.Title = title.Trim();
        item.Description = description?.Trim() ?? string.Empty;
        item.Status = status;
        await db.SaveChangesAsync(cancellationToken);
        return item;
    }
```

In `backend/Controllers/TasksController.cs`, add `[HttpPut("{id:int}")]`:
```csharp
    [HttpPut("{id:int}")]
    public async Task<ActionResult<TaskResponse>> Update(
        int id,
        UpdateTaskRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            ModelState.AddModelError(nameof(request.Title), "Title is required.");
            return ValidationProblem(ModelState);
        }

        if (request.Status is null || !Enum.IsDefined(request.Status.Value))
        {
            ModelState.AddModelError(nameof(request.Status), "Status must be Todo, Doing, or Done.");
            return ValidationProblem(ModelState);
        }

        var item = await service.UpdateAsync(
            id,
            request.Title,
            request.Description,
            request.Status.Value,
            cancellationToken);

        if (item is null)
        {
            return NotFound();
        }

        var response = ToResponse(item);
        await hubContext.Clients.All.SendAsync("TaskUpdated", response, cancellationToken);
        return Ok(response);
    }
```

- [ ] **Step 4: Run all backend tests to verify they pass**

Run: `dotnet test backend.tests/AiTaskDemo.Api.Tests.csproj`
Expected: ALL PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/DTOs/TaskDtos.cs backend/Services/TaskService.cs backend/Controllers/TasksController.cs backend.tests/TasksApiTests.cs
git commit -m "feat(backend): add PUT /api/tasks/{id} endpoint with SignalR broadcast and tests"
```

---

### Task 2: Advanced Querying - Keyword Search & Dynamic Sorting

**Files:**
- Modify: `backend/DTOs/TaskDtos.cs`
- Modify: `backend/Services/TaskService.cs`
- Modify: `backend/Controllers/TasksController.cs`
- Test: `backend.tests/TasksApiTests.cs`

- [ ] **Step 1: Write failing backend integration tests for search and sorting**

In `backend.tests/TasksApiTests.cs`, add:
```csharp
    [Fact]
    public async Task Get_searches_by_keyword_in_title_and_description()
    {
        await SeedAsync(
            NewItem("Frontend design", "Fix button style", TaskState.Todo, DateTime.UtcNow),
            NewItem("Backend API", "Add SignalR Hub", TaskState.Doing, DateTime.UtcNow),
            NewItem("Write documentation", "Summarize frontend features", TaskState.Done, DateTime.UtcNow));

        var items = await factory.CreateClient()
            .GetFromJsonAsync<List<TaskResponse>>("/api/tasks?search=frontend", JsonOptions);

        Assert.Equal(2, items!.Count);
        Assert.Contains(items, x => x.Title == "Frontend design");
        Assert.Contains(items, x => x.Title == "Write documentation");
    }

    [Fact]
    public async Task Get_sorts_by_title_ascending()
    {
        await SeedAsync(
            NewItem("Charlie", TaskState.Todo, DateTime.UtcNow),
            NewItem("Alice", TaskState.Todo, DateTime.UtcNow),
            NewItem("Bob", TaskState.Todo, DateTime.UtcNow));

        var items = await factory.CreateClient()
            .GetFromJsonAsync<List<TaskResponse>>("/api/tasks?sortBy=title&sortOrder=asc", JsonOptions);

        Assert.Equal(new[] { "Alice", "Bob", "Charlie" }, items!.Select(x => x.Title));
    }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `dotnet test backend.tests/AiTaskDemo.Api.Tests.csproj --filter "FullyQualifiedName~Get_sorts|Get_searches"`
Expected: FAIL.

- [ ] **Step 3: Implement search and dynamic sorting in TaskService and TasksController**

In `backend/Services/TaskService.cs`, update `GetAllAsync`:
```csharp
    public Task<List<TaskItem>> GetAllAsync(
        TaskState? status,
        string? search,
        string? sortBy,
        string? sortOrder,
        CancellationToken cancellationToken)
    {
        var query = db.Tasks.AsNoTracking();

        if (status is not null)
        {
            query = query.Where(item => item.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var keyword = search.Trim();
            query = query.Where(item =>
                item.Title.Contains(keyword) || item.Description.Contains(keyword));
        }

        var isAscending = string.Equals(sortOrder, "asc", StringComparison.OrdinalIgnoreCase);

        query = (sortBy?.ToLowerInvariant()) switch
        {
            "title" => isAscending
                ? query.OrderBy(item => item.Title)
                : query.OrderByDescending(item => item.Title),
            "status" => isAscending
                ? query.OrderBy(item => item.Status)
                : query.OrderByDescending(item => item.Status),
            _ => isAscending
                ? query.OrderBy(item => item.CreatedAt)
                : query.OrderByDescending(item => item.CreatedAt),
        };

        return query.ToListAsync(cancellationToken);
    }
```

In `backend/Controllers/TasksController.cs`, update `GetAll`:
```csharp
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TaskResponse>>> GetAll(
        [FromQuery] TaskState? status,
        [FromQuery] string? search,
        [FromQuery] string? sortBy,
        [FromQuery] string? sortOrder,
        CancellationToken cancellationToken)
    {
        if (Request.Query.TryGetValue("status", out var rawStatus) &&
            (rawStatus.Count != 1 || !TaskStatusValidation.TryParse(rawStatus[0], out _)))
        {
            ModelState.AddModelError(nameof(status), "Status must be Todo, Doing, or Done.");
            return ValidationProblem(ModelState);
        }

        if (status is not null && !Enum.IsDefined(status.Value))
        {
            ModelState.AddModelError(nameof(status), "Status must be Todo, Doing, or Done.");
            return ValidationProblem(ModelState);
        }

        var items = await service.GetAllAsync(status, search, sortBy, sortOrder, cancellationToken);
        return Ok(items.Select(ToResponse));
    }
```

- [ ] **Step 4: Run all backend tests to verify they pass**

Run: `dotnet test backend.tests/AiTaskDemo.Api.Tests.csproj`
Expected: ALL PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/Services/TaskService.cs backend/Controllers/TasksController.cs backend.tests/TasksApiTests.cs
git commit -m "feat(backend): add keyword search and dynamic sorting in Task query"
```

---

### Task 3: Global Exception Handling Middleware & RFC 7807 ProblemDetails

**Files:**
- Create: `backend/Middleware/GlobalExceptionMiddleware.cs`
- Modify: `backend/Program.cs`
- Test: `backend.tests/TasksApiTests.cs`

- [ ] **Step 1: Implement GlobalExceptionMiddleware**

Create `backend/Middleware/GlobalExceptionMiddleware.cs`:
```csharp
using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace AiTaskDemo.Api.Middleware;

public sealed class GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An unhandled exception occurred during request execution.");
            await HandleExceptionAsync(context, ex);
        }
    }

    private static Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/problem+json";
        context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;

        var problemDetails = new ProblemDetails
        {
            Status = (int)HttpStatusCode.InternalServerError,
            Title = "An unexpected error occurred on the server.",
            Detail = exception.Message,
            Instance = context.Request.Path
        };

        return context.Response.WriteAsync(JsonSerializer.Serialize(problemDetails));
    }
}
```

- [ ] **Step 2: Register GlobalExceptionMiddleware in Program.cs**

In `backend/Program.cs`:
- Add `using AiTaskDemo.Api.Middleware;`
- Add `app.UseMiddleware<GlobalExceptionMiddleware>();` right before `app.UseCors("Frontend");`.

- [ ] **Step 3: Run all backend tests to verify no regressions**

Run: `dotnet test backend.tests/AiTaskDemo.Api.Tests.csproj`
Expected: ALL PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/Middleware/GlobalExceptionMiddleware.cs backend/Program.cs
git commit -m "feat(backend): add GlobalExceptionMiddleware with RFC 7807 ProblemDetails"
```

---

### Task 4: Documentation Updates & Full Suite Verification

**Files:**
- Modify: `SPEC.md`
- Modify: `README.md`
- Modify: `ROLES.md`

- [ ] **Step 1: Update SPEC.md**
  - Add `PUT /api/tasks/{id}` 端點規格
  - Add `GET /api/tasks?search={keyword}&sortBy={field}&sortOrder={asc|desc}` 參數規格
  - Add Acceptance Criteria：支援模糊搜尋與動態排序

- [ ] **Step 2: Update README.md**
  - 更新 API 表格，加入 `PUT /api/tasks/{id}` 與查詢參數說明

- [ ] **Step 3: Update ROLES.md**
  - 更新全端工程師與 QA 角色的職責與測試驗收矩陣

- [ ] **Step 4: Run all test suites across backend and frontend**

Run:
```powershell
dotnet test backend.tests/AiTaskDemo.Api.Tests.csproj
cd frontend && npm test
```
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add SPEC.md README.md ROLES.md docs/superpowers/plans/2026-08-12-backend-architecture-advanced.md
git commit -m "docs: update spec, readme, and roles with advanced backend architecture features"
```
