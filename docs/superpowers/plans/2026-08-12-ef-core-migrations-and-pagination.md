# EF Core Migrations & Advanced Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 為專案導入正式的 **EF Core 資料庫遷移機制 (Migrations)** 取代原本的 `EnsureCreated()`，並在後端實作 **高效資料庫分頁功能 (Pagination)**，支援 `page`、`pageSize` 與分頁元資料（`totalCount`, `totalPages`），提升資料庫版本管理成熟度與海量資料查詢效能。

**Architecture:** 
1. **EF Core Migrations**: 安裝 `Microsoft.EntityFrameworkCore.Design`，產生 `InitialCreate` 遷移檔案，在 `Program.cs` 啟動時呼叫 `db.Database.Migrate()` 自動應用遷移。
2. **Pagination API**: 新增 `PagedResult<T>` DTO，在 `TaskService.cs` 使用 EF Core `Skip` 與 `Take` 以及 `CountAsync` 高效分頁，在 `TasksController.cs` 支援 `page` (預設 1) 與 `pageSize` (預設 20，上限 100) 參數。
3. **Frontend & Store Integration**: 前端 `taskApi.ts` 與 `taskStore.ts` 支援接收分頁資料或無縫解構陣列，保持雙視圖（List / Kanban）穩定運行。

**Tech Stack:** ASP.NET Core 10, Entity Framework Core 10 (Sqlite + Migrations + Design), xUnit, Vue 3, Pinia, Vitest, Playwright.

---

### Task 1: EF Core Migrations Setup & Database Versioning

**Files:**
- Modify: `backend/AiTaskDemo.Api.csproj`
- Modify: `backend/Program.cs`
- Create: `backend/Migrations/*` (Generated via EF tools)
- Test: `backend.tests/TasksApiTests.cs`

- [ ] **Step 1: Add Microsoft.EntityFrameworkCore.Design to backend csproj**

In `backend/AiTaskDemo.Api.csproj`, add `Microsoft.EntityFrameworkCore.Design`:
```xml
  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.OpenApi" Version="10.0.10" />
    <PackageReference Include="Microsoft.EntityFrameworkCore.Sqlite" Version="10.0.10" />
    <PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="10.0.10">
      <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>
      <PrivateAssets>all</PrivateAssets>
    </PackageReference>
  </ItemGroup>
```

- [ ] **Step 2: Generate InitialCreate Migration via dotnet ef**

Run in terminal:
```bash
dotnet tool restore || dotnet tool install --global dotnet-ef
dotnet ef migrations add InitialCreate --project backend/AiTaskDemo.Api.csproj --output-dir Migrations
```

- [ ] **Step 3: Update Program.cs to use Migrate() on startup**

In `backend/Program.cs`, replace `db.Database.EnsureCreated()` with:
```csharp
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}
```

- [ ] **Step 4: Run backend tests to verify database migrations execute smoothly**

Run: `dotnet test backend.tests/AiTaskDemo.Api.Tests.csproj`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/AiTaskDemo.Api.csproj backend/Program.cs backend/Migrations/
git commit -m "feat(backend): setup EF Core migrations with InitialCreate and automatic startup migration"
```

---

### Task 2: Backend Pagination DTO, Service & Controller Implementation

**Files:**
- Modify: `backend/DTOs/TaskDtos.cs`
- Modify: `backend/Services/TaskService.cs`
- Modify: `backend/Controllers/TasksController.cs`
- Test: `backend.tests/TasksApiTests.cs`

- [ ] **Step 1: Write failing xUnit integration tests for pagination in backend.tests/TasksApiTests.cs**

Add tests:
```csharp
    [Fact]
    public async Task Get_supports_pagination_with_page_and_pageSize()
    {
        for (int i = 1; i <= 15; i++)
        {
            await SeedAsync(NewItem($"Task {i:D2}", TaskState.Todo, DateTime.UtcNow.AddMinutes(i)));
        }

        var client = factory.CreateClient();
        
        // Fetch page 1 (pageSize 5) -> returns latest 5 tasks (15, 14, 13, 12, 11)
        var page1 = await client.GetFromJsonAsync<PagedResult<TaskResponse>>("/api/tasks?page=1&pageSize=5", JsonOptions);
        Assert.NotNull(page1);
        Assert.Equal(15, page1.TotalCount);
        Assert.Equal(1, page1.Page);
        Assert.Equal(5, page1.PageSize);
        Assert.Equal(3, page1.TotalPages);
        Assert.Equal(5, page1.Items.Count);
        Assert.Equal("Task 15", page1.Items[0].Title);

        // Fetch page 2 (pageSize 5) -> returns next 5 tasks (10, 09, 08, 07, 06)
        var page2 = await client.GetFromJsonAsync<PagedResult<TaskResponse>>("/api/tasks?page=2&pageSize=5", JsonOptions);
        Assert.NotNull(page2);
        Assert.Equal(5, page2.Items.Count);
        Assert.Equal("Task 10", page2.Items[0].Title);
    }

    [Theory]
    [InlineData(0, 10)]
    [InlineData(-1, 10)]
    [InlineData(1, 0)]
    [InlineData(1, 101)]
    public async Task Get_rejects_invalid_pagination_parameters(int page, int pageSize)
    {
        var response = await factory.CreateClient().GetAsync($"/api/tasks?page={page}&pageSize={pageSize}");
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `dotnet test backend.tests/AiTaskDemo.Api.Tests.csproj --filter "FullyQualifiedName~pagination"`

- [ ] **Step 3: Define PagedResult DTO in backend/DTOs/TaskDtos.cs**

```csharp
public sealed record PagedResult<T>(
    IReadOnlyList<T> Items,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages);
```

- [ ] **Step 4: Update TaskService.cs to return PagedResult**

```csharp
public async Task<(List<TaskItem> Items, int TotalCount)> GetPagedAsync(
    TaskState? status,
    string? search,
    string? sortBy,
    string? sortOrder,
    int page,
    int pageSize,
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

    var totalCount = await query.CountAsync(cancellationToken);

    var isAscending = string.Equals(sortOrder, "asc", StringComparison.OrdinalIgnoreCase);
    query = (sortBy?.ToLowerInvariant()) switch
    {
        "title" => isAscending ? query.OrderBy(x => x.Title) : query.OrderByDescending(x => x.Title),
        "status" => isAscending ? query.OrderBy(x => x.Status) : query.OrderByDescending(x => x.Status),
        _ => isAscending ? query.OrderBy(x => x.CreatedAt) : query.OrderByDescending(x => x.CreatedAt),
    };

    var items = await query
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .ToListAsync(cancellationToken);

    return (items, totalCount);
}
```

- [ ] **Step 5: Update TasksController.cs with page & pageSize validation and endpoint**

In `backend/Controllers/TasksController.cs`:
```csharp
    [HttpGet]
    public async Task<ActionResult<object>> GetAll(
        [FromQuery] string? status,
        [FromQuery] string? search,
        [FromQuery] string? sortBy,
        [FromQuery] string? sortOrder,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        if (page < 1)
        {
            ModelState.AddModelError(nameof(page), "Page must be greater than or equal to 1.");
            return ValidationProblem(ModelState);
        }

        if (pageSize < 1 || pageSize > 100)
        {
            ModelState.AddModelError(nameof(pageSize), "PageSize must be between 1 and 100.");
            return ValidationProblem(ModelState);
        }

        // Validate status if provided
        TaskState? taskStatus = null;
        if (status is not null)
        {
            if (string.IsNullOrWhiteSpace(status) || !Enum.TryParse<TaskState>(status, ignoreCase: true, out var parsed))
            {
                ModelState.AddModelError(nameof(status), "Invalid status value.");
                return ValidationProblem(ModelState);
            }
            taskStatus = parsed;
        }

        var (items, totalCount) = await service.GetPagedAsync(taskStatus, search, sortBy, sortOrder, page, pageSize, cancellationToken);
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);
        var responses = items.Select(ToResponse).ToList();

        var result = new PagedResult<TaskResponse>(responses, totalCount, page, pageSize, totalPages);
        return Ok(result);
    }
```

- [ ] **Step 6: Update existing tests for PagedResult structure & run all backend tests**

Run: `dotnet test backend.tests/AiTaskDemo.Api.Tests.csproj`
Expected: All 42+ tests pass.

- [ ] **Step 7: Commit**

```bash
git add backend/DTOs/TaskDtos.cs backend/Services/TaskService.cs backend/Controllers/TasksController.cs backend.tests/TasksApiTests.cs
git commit -m "feat(backend): add database pagination with PagedResult DTO, validation, and integration tests"
```

---

### Task 3: Frontend Integration & End-to-End Verification

**Files:**
- Modify: `frontend/src/api/taskApi.ts`
- Modify: `frontend/src/stores/taskStore.ts`
- Modify: `frontend/src/types/task.ts`
- Modify: `frontend/tests/taskApi.spec.ts`
- Modify: `frontend/tests/taskStore.spec.ts`
- Modify: `frontend/e2e/tasks.spec.ts`
- Modify: `SPEC.md`
- Modify: `README.md`

- [ ] **Step 1: Update frontend types & taskApi to support PagedResult**

In `frontend/src/types/task.ts`:
```typescript
export interface PagedResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}
```

In `frontend/src/api/taskApi.ts`:
```typescript
export async function getTasks(params?: {
  status?: TaskStatus
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}): Promise<PagedResult<TaskItem>> {
  const response = await apiClient.get<PagedResult<TaskItem>>('/tasks', { params })
  return response.data
}
```

- [ ] **Step 2: Update taskStore.ts to unwrap items and store pagination state**

Update `taskStore.ts` to store `totalCount`, `page`, `pageSize`, `totalPages` and update `fetchTasks`.

- [ ] **Step 3: Update frontend unit tests & E2E mocks**

Update `frontend/tests/*` and `frontend/e2e/tasks.spec.ts` to mock `PagedResult` format.

- [ ] **Step 4: Run all frontend and backend tests to verify 100% green**

Run:
```powershell
dotnet test backend.tests/AiTaskDemo.Api.Tests.csproj
cd frontend && npm test && npm run test:e2e && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add frontend/ SPEC.md README.md docs/superpowers/plans/2026-08-12-ef-core-migrations-and-pagination.md
git commit -m "feat: complete pagination support across frontend, backend, tests, and documentation"
```
