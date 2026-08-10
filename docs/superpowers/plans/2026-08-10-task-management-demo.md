# 任務管理示範實作計畫

> **供代理工作者使用：** 必要子技能：使用 `superpowers:subagent-driven-development`（建議）或 `superpowers:executing-plans` 逐項實作本計畫；步驟以核取方塊（`- [ ]`）追蹤。

**目標：** 建立一套可新增、查詢、依狀態篩選及修改任務狀態的 Vue 3 + ASP.NET Core 任務管理示範系統。

**架構：** Vue 3 單頁應用程式以 Pinia 集中管理任務、篩選、載入和錯誤狀態，並透過 Axios 呼叫 REST API。ASP.NET Core 控制器負責 HTTP 契約與驗證，`TaskService` 封裝 EF Core 查詢和異動，SQLite 保存資料；前後端各自以自動化測試固定行為。

**技術堆疊：** Vue 3、TypeScript、Pinia、Vite、Axios、Vitest、Vue Test Utils、ASP.NET Core 10、Entity Framework Core 10、SQLite、xUnit、`WebApplicationFactory`

## 全域限制

- 任務欄位固定為：`id`、`title`、`description`、`status`、`createdAt`。
- 狀態固定為：`Todo`、`Doing`、`Done`。
- 功能固定為：查詢任務、新增任務、修改任務狀態、依狀態篩選。
- `title` 必填且不得為空白。
- `title` 最大 100 字；超過時 API 必須回傳 HTTP 400。
- `status` 必須為 `Todo`、`Doing` 或 `Done`；其他值必須回傳 HTTP 400。
- API 採用 RESTful 設計，資源名稱固定使用複數 `tasks`。
- API 路徑固定為：`GET /api/tasks`、`POST /api/tasks`、`PATCH /api/tasks/{id}/status`。
- 未提供新增狀態時使用 `Todo`；`description` 可省略並保存為空字串。
- GET 篩選使用可省略的 `status` 查詢字串，例如 `GET /api/tasks?status=Doing`。
- 不增加登入、刪除任務、分頁、Repository 層或部署設定。

---

## 檔案結構

```text
ai-task-demo/
├─ SPEC.md                         # 原始需求、API 契約、驗收與啟動方式
├─ frontend/
│  ├─ src/
│  │  ├─ api/taskApi.ts            # Axios CRUD/query 呼叫
│  │  ├─ stores/taskStore.ts       # 任務、篩選、loading、error 狀態
│  │  ├─ types/task.ts             # 前端共享 API 型別
│  │  ├─ App.vue                   # 表單、篩選器與任務列表
│  │  └─ main.ts                   # Vue 與 Pinia 啟動點
│  ├─ tests/
│  │  ├─ taskApi.spec.ts           # URL、query 與 payload 測試
│  │  ├─ taskStore.spec.ts         # store 非同步流程測試
│  │  └─ App.spec.ts               # 使用者互動測試
│  ├─ index.html
│  ├─ package.json
│  ├─ tsconfig.json
│  └─ vite.config.ts
├─ backend/
│  ├─ Controllers/TasksController.cs # HTTP 路由、驗證與狀態碼
│  ├─ Data/AppDbContext.cs           # EF Core DbContext
│  ├─ DTOs/TaskDtos.cs               # Create、UpdateStatus、Response DTO
│  ├─ Models/TaskItem.cs              # 實體與 TaskStatus enum
│  ├─ Services/TaskService.cs         # 查詢、新增、狀態更新
│  ├─ Program.cs                      # DI、JSON enum、CORS、SQLite 初始化
│  ├─ appsettings.json
│  └─ AiTaskDemo.Api.csproj
├─ global.json                       # Pin .NET 10 SDK feature band
└─ backend.tests/
   ├─ CustomWebApplicationFactory.cs  # 隔離式 SQLite API 測試主機
   ├─ TasksApiTests.cs                # GET、POST、PATCH 與驗證測試
   └─ AiTaskDemo.Api.Tests.csproj
```

## 角色作業模式

| 角色 | 代理負責範圍 | 職責 | 必要技能與套件 |
|---|---|---|---|
| PM／協調者 | 根代理 | 維護範圍、驗收可追溯性、任務順序、審查關卡及最終交接；角色審查期間不撰寫功能程式碼。 | `superpowers:writing-plans`、`superpowers:subagent-driven-development`、Git |
| 全端工程師 | 專屬子代理 | 實作 ASP.NET Core API、EF Core／SQLite 持久化、DTO 契約、前後端整合及後端測試。 | `superpowers:test-driven-development`；.NET 10 SDK、EF Core SQLite、xUnit、`Microsoft.AspNetCore.Mvc.Testing` |
| 前端工程師 | 專屬子代理 | 實作 Vue 3 UI、TypeScript 型別、Axios 用戶端、Pinia store、驗證 UX 及前端測試。 | `superpowers:test-driven-development`；Node.js、npm、Vue、Pinia、Axios、Vite、Vitest、Vue Test Utils |
| QA 工程師 | 專屬子代理 | 審查驗收覆蓋率、驗證 API 邊界案例、執行自動化套件及瀏覽器冒煙測試，並回報可重現的缺陷。 | 發生失敗時使用 `superpowers:systematic-debugging`、`superpowers:verification-before-completion`；xUnit、Vitest、PowerShell HTTP 檢查 |

### 協作規則

- PM 僅向各角色提供已核准的任務簡報、全域限制、先前介面及報告路徑。
- 全端工程師與前端工程師不得同時修改相同檔案。
- QA 審查每個完成的實作切片，且絕不直接修改正式程式碼。
- 每個實作任務均遵循 RED → GREEN → 重構，產生聚焦的提交，並在下一個相依任務開始前通過角色獨立審查。
- 需求衝突交由 PM 決定；各角色不得自行重新詮釋規格。

## 任務 1：建立後端領域模型與 SQLite 持久化

**主要角色：** 全端工程師  
**審查角色：** QA 工程師  
**PM 關卡：** 確認模型欄位及三個允許的狀態值符合規格。

**檔案：**
- 建立：`backend/AiTaskDemo.Api.csproj`
- 建立：`backend/Models/TaskItem.cs`
- 建立：`backend/Data/AppDbContext.cs`
- 建立：`backend/appsettings.json`
- 建立：`backend.tests/AiTaskDemo.Api.Tests.csproj`
- 建立：`backend.tests/TaskPersistenceTests.cs`
- 建立：`global.json`

**介面：**
- 取用：無。
- 產出：`AiTaskDemo.Api.Models.TaskStatus`、`TaskItem`、`AppDbContext(DbContextOptions<AppDbContext>)` 與 `DbSet<TaskItem> Tasks`。

- [ ] **步驟 1：建立後端專案與測試專案資訊清單**

```xml
<!-- backend/AiTaskDemo.Api.csproj -->
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.EntityFrameworkCore.Sqlite" Version="10.0.10" />
  </ItemGroup>
</Project>
```

```json
// global.json
{
  "sdk": {
    "version": "10.0.302",
    "rollForward": "latestPatch"
  }
}
```

```xml
<!-- backend.tests/AiTaskDemo.Api.Tests.csproj -->
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <IsPackable>false</IsPackable>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.Mvc.Testing" Version="10.0.10" />
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.14.1" />
    <PackageReference Include="xunit" Version="2.9.3" />
    <PackageReference Include="xunit.runner.visualstudio" Version="3.1.4" />
  </ItemGroup>
  <ItemGroup>
    <ProjectReference Include="..\backend\AiTaskDemo.Api.csproj" />
  </ItemGroup>
</Project>
```

- [ ] **步驟 2：撰寫會失敗的 SQLite 持久化測試**

```csharp
// backend.tests/TaskPersistenceTests.cs
using AiTaskDemo.Api.Data;
using AiTaskDemo.Api.Models;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using TaskState = AiTaskDemo.Api.Models.TaskStatus;
using Xunit;

namespace AiTaskDemo.Api.Tests;

public sealed class TaskPersistenceTests
{
    [Fact]
    public async Task Saves_and_reads_all_task_fields()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(connection)
            .Options;

        await using (var writeContext = new AppDbContext(options))
        {
            await writeContext.Database.EnsureCreatedAsync();
            writeContext.Tasks.Add(new TaskItem
            {
                Title = "Review generated code",
                Description = "Check API behavior",
                Status = TaskState.Doing,
                CreatedAt = new DateTime(2026, 8, 10, 8, 0, 0, DateTimeKind.Utc)
            });
            await writeContext.SaveChangesAsync();
        }

        await using var readContext = new AppDbContext(options);
        var item = await readContext.Tasks.SingleAsync();
        Assert.True(item.Id > 0);
        Assert.Equal("Review generated code", item.Title);
        Assert.Equal("Check API behavior", item.Description);
        Assert.Equal(TaskState.Doing, item.Status);
        Assert.Equal(new DateTime(2026, 8, 10, 8, 0, 0, DateTimeKind.Utc), item.CreatedAt);
    }
}
```

- [ ] **步驟 3：執行測試並確認其失敗**

執行：`dotnet test backend.tests/AiTaskDemo.Api.Tests.csproj --filter Saves_and_reads_all_task_fields`

預期：失敗，因為 `TaskItem`、`TaskStatus` 及 `AppDbContext` 尚不存在。

- [ ] **步驟 4：實作領域實體與 DbContext**

```csharp
// backend/Models/TaskItem.cs
namespace AiTaskDemo.Api.Models;

public enum TaskStatus
{
    Todo,
    Doing,
    Done
}

public sealed class TaskItem
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public string Description { get; set; } = string.Empty;
    public TaskStatus Status { get; set; } = TaskStatus.Todo;
    public DateTime CreatedAt { get; set; }
}
```

```csharp
// backend/Data/AppDbContext.cs
using AiTaskDemo.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AiTaskDemo.Api.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<TaskItem> Tasks => Set<TaskItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var task = modelBuilder.Entity<TaskItem>();
        task.Property(x => x.Title).HasMaxLength(100).IsRequired();
        task.Property(x => x.Description).IsRequired();
        task.Property(x => x.Status).HasConversion<string>().IsRequired();
        task.Property(x => x.CreatedAt).IsRequired();
    }
}
```

```json
// backend/appsettings.json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*"
}
```

- [ ] **步驟 5：執行持久化測試**

執行：`dotnet test backend.tests/AiTaskDemo.Api.Tests.csproj --filter Saves_and_reads_all_task_fields`

預期：通過；一個測試成功。

- [ ] **步驟 6：提交後端領域切片**

```bash
git add backend backend.tests
git commit -m "feat: add task domain and sqlite persistence"
```

## 任務 2：實作 GET 任務清單與狀態篩選

**主要角色：** 全端工程師  
**審查角色：** QA 工程師  
**PM 關卡：** 確認清單及狀態篩選的驗收條件可追溯至自動化測試。

**檔案：**
- 建立：`backend/DTOs/TaskDtos.cs`
- 建立：`backend/Services/TaskService.cs`
- 建立：`backend/Controllers/TasksController.cs`
- 建立：`backend/Program.cs`
- 建立：`backend.tests/CustomWebApplicationFactory.cs`
- 建立：`backend.tests/TasksApiTests.cs`

**介面：**
- 取用：任務 1 的 `AppDbContext.Tasks` 與 `TaskStatus`。
- 產出：`TaskResponse(int Id, string Title, string Description, TaskStatus Status, DateTime CreatedAt)`、`TaskService.GetAllAsync(TaskStatus?, CancellationToken)` 與 `GET /api/tasks?status={status}`。

- [ ] **步驟 1：加入隔離的 API 測試主機**

```csharp
// backend.tests/CustomWebApplicationFactory.cs
using AiTaskDemo.Api.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace AiTaskDemo.Api.Tests;

public sealed class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    private SqliteConnection? _connection;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            _connection = new SqliteConnection("Data Source=:memory:");
            _connection.Open();
            services.AddDbContext<AppDbContext>(options => options.UseSqlite(_connection));
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing)
        {
            _connection?.Dispose();
        }
    }
}
```

- [ ] **步驟 2：撰寫會失敗的 GET 與篩選測試**

```csharp
// backend.tests/TasksApiTests.cs
using System.Net;
using System.Net.Http.Json;
using AiTaskDemo.Api.Data;
using AiTaskDemo.Api.DTOs;
using AiTaskDemo.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TaskState = AiTaskDemo.Api.Models.TaskStatus;
using Xunit;

namespace AiTaskDemo.Api.Tests;

public sealed class TasksApiTests(CustomWebApplicationFactory factory)
    : IClassFixture<CustomWebApplicationFactory>
{
    [Fact]
    public async Task Get_returns_tasks_newest_first()
    {
        await SeedAsync(
            NewItem("Older", TaskState.Todo, new DateTime(2026, 8, 9, 8, 0, 0, DateTimeKind.Utc)),
            NewItem("Newer", TaskState.Done, new DateTime(2026, 8, 10, 8, 0, 0, DateTimeKind.Utc)));

        var items = await factory.CreateClient().GetFromJsonAsync<List<TaskResponse>>("/api/tasks");

        Assert.Equal(new[] { "Newer", "Older" }, items!.Select(x => x.Title));
    }

    [Fact]
    public async Task Get_filters_by_status()
    {
        await SeedAsync(
            NewItem("Todo item", TaskState.Todo, DateTime.UtcNow),
            NewItem("Doing item", TaskState.Doing, DateTime.UtcNow));

        var items = await factory.CreateClient()
            .GetFromJsonAsync<List<TaskResponse>>("/api/tasks?status=Doing");

        var item = Assert.Single(items!);
        Assert.Equal("Doing item", item.Title);
        Assert.Equal(TaskState.Doing, item.Status);
    }

    [Theory]
    [InlineData("Blocked")]
    [InlineData("99")]
    public async Task Get_rejects_unknown_status(string status)
    {
        var response = await factory.CreateClient().GetAsync($"/api/tasks?status={status}");
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private async Task SeedAsync(params TaskItem[] items)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Tasks.RemoveRange(db.Tasks);
        await db.SaveChangesAsync();
        db.Tasks.AddRange(items);
        await db.SaveChangesAsync();
    }

    private static TaskItem NewItem(string title, TaskState status, DateTime createdAt) =>
        new() { Title = title, Description = string.Empty, Status = status, CreatedAt = createdAt };
}
```

- [ ] **步驟 3：執行 GET 測試並確認其失敗**

執行：`dotnet test backend.tests/AiTaskDemo.Api.Tests.csproj --filter "Get_"`

預期：失敗，因為 API 進入點、DTO、服務與控制器尚不存在。

- [ ] **步驟 4：定義 API DTO 與查詢服務**

```csharp
// backend/DTOs/TaskDtos.cs
using System.ComponentModel.DataAnnotations;
using AiTaskDemo.Api.Models;
using TaskState = AiTaskDemo.Api.Models.TaskStatus;

namespace AiTaskDemo.Api.DTOs;

public sealed record CreateTaskRequest(
    [property: Required, MaxLength(100)] string? Title,
    string? Description,
    TaskState? Status);

public sealed record UpdateTaskStatusRequest(TaskState? Status);

public sealed record TaskResponse(
    int Id,
    string Title,
    string Description,
    TaskState Status,
    DateTime CreatedAt);
```

```csharp
// backend/Services/TaskService.cs
using AiTaskDemo.Api.Data;
using AiTaskDemo.Api.Models;
using Microsoft.EntityFrameworkCore;
using TaskState = AiTaskDemo.Api.Models.TaskStatus;

namespace AiTaskDemo.Api.Services;

public sealed class TaskService(AppDbContext db)
{
    public Task<List<TaskItem>> GetAllAsync(TaskState? status, CancellationToken cancellationToken)
    {
        var query = db.Tasks.AsNoTracking();
        if (status is not null)
        {
            query = query.Where(item => item.Status == status);
        }

        return query.OrderByDescending(item => item.CreatedAt).ToListAsync(cancellationToken);
    }
}
```

- [ ] **步驟 5：實作 GET 控制器與應用程式啟動設定**

```csharp
// backend/Controllers/TasksController.cs
using AiTaskDemo.Api.DTOs;
using AiTaskDemo.Api.Models;
using AiTaskDemo.Api.Services;
using Microsoft.AspNetCore.Mvc;
using TaskState = AiTaskDemo.Api.Models.TaskStatus;

namespace AiTaskDemo.Api.Controllers;

[ApiController]
[Route("api/tasks")]
public sealed class TasksController(TaskService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TaskResponse>>> GetAll(
        [FromQuery] TaskState? status,
        CancellationToken cancellationToken)
    {
        if (status is not null && !Enum.IsDefined(status.Value))
        {
            ModelState.AddModelError(nameof(status), "Status must be Todo, Doing, or Done.");
            return ValidationProblem(ModelState);
        }

        var items = await service.GetAllAsync(status, cancellationToken);
        return Ok(items.Select(ToResponse));
    }

    private static TaskResponse ToResponse(TaskItem item) =>
        new(item.Id, item.Title, item.Description, item.Status, item.CreatedAt);
}
```

```csharp
// backend/Program.cs
using System.Text.Json.Serialization;
using AiTaskDemo.Api.Data;
using AiTaskDemo.Api.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers().AddJsonOptions(options =>
    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(allowIntegerValues: false)));
var databasePath = Path.Combine(builder.Environment.ContentRootPath, "tasks.db");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite($"Data Source={databasePath}"));
builder.Services.AddScoped<TaskService>();
builder.Services.AddCors(options => options.AddPolicy("Frontend", policy =>
    policy.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();
app.UseCors("Frontend");
app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

app.Run();

public partial class Program { }
```

- [ ] **步驟 6：執行 GET 測試**

執行：`dotnet test backend.tests/AiTaskDemo.Api.Tests.csproj --filter "Get_"`

預期：通過；三個 GET 測試皆成功。

- [ ] **步驟 7：提交 GET 與篩選功能**

```bash
git add backend backend.tests
git commit -m "feat: add task query and status filtering API"
```

## 任務 3：實作 POST 任務與驗證

**主要角色：** 全端工程師  
**審查角色：** QA 工程師  
**PM 關卡：** 確認空白及超過 100 字的標題會回傳 HTTP 400。

**檔案：**
- 修改：`backend/Services/TaskService.cs`
- 修改：`backend/Controllers/TasksController.cs`
- 修改：`backend.tests/TasksApiTests.cs`

**介面：**
- 取用：任務 2 的 `CreateTaskRequest` 與 `TaskResponse`。
- 產出：`TaskService.CreateAsync(string, string?, TaskStatus?, CancellationToken)` 及 `POST /api/tasks`；成功回傳 `201`，空白、過長或無效輸入回傳 `400`。

- [ ] **步驟 1：在 `TasksApiTests` 加入會失敗的 POST 驗收測試**

```csharp
[Fact]
public async Task Post_creates_task_and_defaults_status_to_todo()
{
    var response = await factory.CreateClient().PostAsJsonAsync("/api/tasks", new
    {
        title = "Write tests",
        description = "Cover the API"
    });

    Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    var item = await response.Content.ReadFromJsonAsync<TaskResponse>();
    Assert.Equal("Write tests", item!.Title);
    Assert.Equal("Cover the API", item.Description);
    Assert.Equal(TaskState.Todo, item.Status);
    Assert.True(item.Id > 0);
    Assert.NotEqual(default, item.CreatedAt);
}

[Theory]
[InlineData("Todo")]
[InlineData("Doing")]
[InlineData("Done")]
public async Task Post_accepts_each_explicit_valid_status(string status)
{
    var response = await factory.CreateClient().PostAsJsonAsync("/api/tasks", new
    {
        title = $"Create as {status}",
        status
    });

    Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    var item = await response.Content.ReadFromJsonAsync<TaskResponse>();
    Assert.Equal(Enum.Parse<TaskState>(status), item!.Status);
}

[Theory]
[InlineData("")]
[InlineData("   ")]
public async Task Post_rejects_blank_title(string title)
{
    var response = await factory.CreateClient().PostAsJsonAsync("/api/tasks", new { title });
    Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
}

[Fact]
public async Task Post_rejects_title_over_100_characters()
{
    var response = await factory.CreateClient().PostAsJsonAsync("/api/tasks", new
    {
        title = new string('x', 101)
    });
    Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
}

[Fact]
public async Task Post_rejects_unknown_status()
{
    var response = await factory.CreateClient().PostAsJsonAsync("/api/tasks", new
    {
        title = "Invalid status",
        status = "Blocked"
    });
    Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
}

[Fact]
public async Task Post_rejects_numeric_status()
{
    var response = await factory.CreateClient().PostAsJsonAsync("/api/tasks", new
    {
        title = "Invalid numeric status",
        status = 99
    });
    Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
}
```

- [ ] **步驟 2：執行 POST 測試並確認其失敗**

執行：`dotnet test backend.tests/AiTaskDemo.Api.Tests.csproj --filter "Post_"`

預期：以 HTTP 405 失敗，因為尚未實作 POST。

- [ ] **步驟 3：為 `TaskService` 加入最小化的建立方法**

```csharp
public async Task<TaskItem> CreateAsync(
    string title,
    string? description,
    TaskState? status,
    CancellationToken cancellationToken)
{
    var item = new TaskItem
    {
        Title = title.Trim(),
        Description = description?.Trim() ?? string.Empty,
        Status = status ?? TaskState.Todo,
        CreatedAt = DateTime.UtcNow
    };
    db.Tasks.Add(item);
    await db.SaveChangesAsync(cancellationToken);
    return item;
}
```

- [ ] **步驟 4：在 `TasksController` 加入含空白驗證的 POST**

```csharp
[HttpPost]
public async Task<ActionResult<TaskResponse>> Create(
    CreateTaskRequest request,
    CancellationToken cancellationToken)
{
    if (string.IsNullOrWhiteSpace(request.Title))
    {
        ModelState.AddModelError(nameof(request.Title), "Title is required.");
        return ValidationProblem(ModelState);
    }

    var item = await service.CreateAsync(
        request.Title,
        request.Description,
        request.Status,
        cancellationToken);
    return StatusCode(StatusCodes.Status201Created, ToResponse(item));
}
```

- [ ] **步驟 5：執行所有後端測試**

執行：`dotnet test backend.tests/AiTaskDemo.Api.Tests.csproj`

預期：通過；涵蓋持久化、GET、篩選、POST、空白標題、101 字標題及無效狀態。

- [ ] **步驟 6：提交任務建立功能**

```bash
git add backend backend.tests
git commit -m "feat: add task creation and validation"
```

## 任務 4：實作 PATCH 任務狀態

**主要角色：** 全端工程師  
**審查角色：** QA 工程師  
**PM 關卡：** 確認僅接受 `Todo`、`Doing` 與 `Done`。

**檔案：**
- 修改：`backend/Services/TaskService.cs`
- 修改：`backend/Controllers/TasksController.cs`
- 修改：`backend.tests/TasksApiTests.cs`

**介面：**
- 取用：任務 2 的 `UpdateTaskStatusRequest` 與 `TaskStatus`。
- 產出：`TaskService.UpdateStatusAsync(int, TaskStatus, CancellationToken)` 及 `PATCH /api/tasks/{id}/status`，回傳 `200`、`400` 或 `404`。

- [ ] **步驟 1：在 `TasksApiTests` 加入會失敗的 PATCH 測試**

```csharp
[Theory]
[InlineData("Todo")]
[InlineData("Doing")]
[InlineData("Done")]
public async Task Patch_updates_and_persists_each_valid_status(string targetStatus)
{
    await SeedAsync(NewItem("Move me", TaskState.Todo, DateTime.UtcNow));
    int id;
    using (var scope = factory.Services.CreateScope())
    {
        id = scope.ServiceProvider.GetRequiredService<AppDbContext>().Tasks.Single().Id;
    }

    var request = new HttpRequestMessage(HttpMethod.Patch, $"/api/tasks/{id}/status")
    {
        Content = JsonContent.Create(new { status = targetStatus })
    };
    var response = await factory.CreateClient().SendAsync(request);

    Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    var item = await response.Content.ReadFromJsonAsync<TaskResponse>();
    var expected = Enum.Parse<TaskState>(targetStatus);
    Assert.Equal(expected, item!.Status);

    using var verifyScope = factory.Services.CreateScope();
    var persisted = await verifyScope.ServiceProvider.GetRequiredService<AppDbContext>()
        .Tasks.AsNoTracking().SingleAsync(task => task.Id == id);
    Assert.Equal(expected, persisted.Status);
}

[Fact]
public async Task Patch_returns_not_found_for_unknown_id()
{
    var request = new HttpRequestMessage(HttpMethod.Patch, "/api/tasks/99999/status")
    {
        Content = JsonContent.Create(new { status = "Doing" })
    };
    var response = await factory.CreateClient().SendAsync(request);
    Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
}

[Theory]
[InlineData(null)]
[InlineData("Blocked")]
public async Task Patch_rejects_missing_or_unknown_status(string? status)
{
    var request = new HttpRequestMessage(HttpMethod.Patch, "/api/tasks/1/status")
    {
        Content = JsonContent.Create(new { status })
    };
    var response = await factory.CreateClient().SendAsync(request);
    Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
}

[Fact]
public async Task Patch_rejects_numeric_status()
{
    var request = new HttpRequestMessage(HttpMethod.Patch, "/api/tasks/1/status")
    {
        Content = JsonContent.Create(new { status = 99 })
    };
    var response = await factory.CreateClient().SendAsync(request);
    Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
}
```

- [ ] **步驟 2：執行 PATCH 測試並確認其失敗**

執行：`dotnet test backend.tests/AiTaskDemo.Api.Tests.csproj --filter "Patch_"`

預期：以 HTTP 405 失敗，因為尚未實作 PATCH。

- [ ] **步驟 3：在 `TaskService` 實作狀態更新**

```csharp
public async Task<TaskItem?> UpdateStatusAsync(
    int id,
    TaskState status,
    CancellationToken cancellationToken)
{
    var item = await db.Tasks.FindAsync([id], cancellationToken);
    if (item is null)
    {
        return null;
    }

    item.Status = status;
    await db.SaveChangesAsync(cancellationToken);
    return item;
}
```

- [ ] **步驟 4：在 `TasksController` 實作 PATCH**

```csharp
[HttpPatch("{id:int}/status")]
public async Task<ActionResult<TaskResponse>> UpdateStatus(
    int id,
    UpdateTaskStatusRequest request,
    CancellationToken cancellationToken)
{
    if (request.Status is null)
    {
        ModelState.AddModelError(nameof(request.Status), "Status is required.");
        return ValidationProblem(ModelState);
    }

    var item = await service.UpdateStatusAsync(id, request.Status.Value, cancellationToken);
    return item is null ? NotFound() : Ok(ToResponse(item));
}
```

- [ ] **步驟 5：執行所有後端測試並建置**

執行：

```powershell
dotnet test backend.tests/AiTaskDemo.Api.Tests.csproj
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
dotnet build backend/AiTaskDemo.Api.csproj
```

預期：通過，零測試失敗且零建置錯誤。

- [ ] **步驟 6：提交狀態更新功能**

```bash
git add backend backend.tests
git commit -m "feat: add task status update API"
```

## 任務 5：建立前端型別與 API 用戶端骨架

**主要角色：** 前端工程師  
**審查角色：** 全端工程師負責 API 契約相容性；QA 工程師負責請求測試。  
**PM 關卡：** 確認前端欄位與端點名稱完全符合後端契約。

**檔案：**
- 建立：`frontend/package.json`
- 建立：`frontend/package-lock.json`（由 `npm.cmd install` 產生並提交）
- 建立：`frontend/tsconfig.json`
- 建立：`frontend/vite.config.ts`
- 建立：`frontend/index.html`
- 建立：`frontend/src/types/task.ts`
- 建立：`frontend/src/api/taskApi.ts`
- 建立：`frontend/tests/taskApi.spec.ts`

**介面：**
- 取用：任務 2–4 的後端 JSON 契約。
- 產出：`TaskStatus`、`TaskItem`、`CreateTaskRequest`、`getTasks(status?)`、`createTask(request)` 及 `updateTaskStatus(id, status)`。

- [ ] **步驟 1：建立前端設定**

```json
// frontend/package.json
{
  "name": "ai-task-demo-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "engines": {
    "node": "^20.19.0 || >=22.12.0"
  },
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "axios": "^1.11.0",
    "pinia": "^4.0.2",
    "vue": "^3.5.40"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^6.0.8",
    "@vue/test-utils": "^2.4.6",
    "axios-mock-adapter": "^2.1.0",
    "jsdom": "^26.1.0",
    "typescript": "~5.8.3",
    "vite": "^8.1.5",
    "vitest": "^4.1.10",
    "vue-tsc": "^3.0.5"
  }
}
```

```json
// frontend/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "jsx": "preserve",
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client", "vitest/globals"]
  },
  "include": ["src/**/*.ts", "src/**/*.vue", "tests/**/*.ts", "vite.config.ts"]
}
```

```ts
// frontend/vite.config.ts
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: { port: 5173, strictPort: true },
  test: { environment: 'jsdom' },
})
```

```html
<!-- frontend/index.html -->
<div id="app"></div>
<script type="module" src="/src/main.ts"></script>
```

- [ ] **步驟 2：定義精確的前端 API 型別**

```ts
// frontend/src/types/task.ts
export type TaskStatus = 'Todo' | 'Doing' | 'Done'

export interface TaskItem {
  id: number
  title: string
  description: string
  status: TaskStatus
  createdAt: string
}

export interface CreateTaskRequest {
  title: string
  description?: string
  status?: TaskStatus
}

export interface UpdateTaskStatusRequest {
  status: TaskStatus
}
```

- [ ] **步驟 3：撰寫會失敗的 API 用戶端測試**

```ts
// frontend/tests/taskApi.spec.ts
import MockAdapter from 'axios-mock-adapter'
import { afterEach, describe, expect, it } from 'vitest'
import { apiClient, createTask, getTasks, updateTaskStatus } from '../src/api/taskApi'

const mock = new MockAdapter(apiClient)

afterEach(() => mock.reset())

describe('taskApi', () => {
  it('requests all tasks without a status parameter', async () => {
    mock.onGet('/tasks').reply(200, [])
    await expect(getTasks()).resolves.toEqual([])
    expect(mock.history.get[0].params).toBeUndefined()
  })

  it('requests tasks with an optional status filter', async () => {
    mock.onGet('/tasks', { params: { status: 'Doing' } }).reply(200, [])
    await expect(getTasks('Doing')).resolves.toEqual([])
  })

  it('posts the create payload', async () => {
    const item = { id: 1, title: 'Plan', description: '', status: 'Todo', createdAt: '2026-08-10T00:00:00Z' }
    mock.onPost('/tasks', { title: 'Plan' }).reply(201, item)
    await expect(createTask({ title: 'Plan' })).resolves.toEqual(item)
  })

  it('patches only the status', async () => {
    const item = { id: 1, title: 'Plan', description: '', status: 'Done', createdAt: '2026-08-10T00:00:00Z' }
    mock.onPatch('/tasks/1/status', { status: 'Done' }).reply(200, item)
    await expect(updateTaskStatus(1, 'Done')).resolves.toEqual(item)
  })
})
```

- [ ] **步驟 4：執行 API 用戶端測試並確認其失敗**

執行：

```powershell
Push-Location frontend
try {
  npm.cmd install
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  npm.cmd test -- taskApi.spec.ts
} finally {
  Pop-Location
}
```

預期：失敗，因為 `src/api/taskApi.ts` 尚不存在。

確認 `frontend/package-lock.json` 已存在，並將其納入任務 5 的提交，讓後續驗證可使用 `npm.cmd ci`。

- [ ] **步驟 5：實作 Axios API 用戶端**

```ts
// frontend/src/api/taskApi.ts
import axios from 'axios'
import type { CreateTaskRequest, TaskItem, TaskStatus } from '../types/task'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api',
})

export async function getTasks(status?: TaskStatus): Promise<TaskItem[]> {
  const response = await apiClient.get<TaskItem[]>('/tasks', {
    params: status ? { status } : undefined,
  })
  return response.data
}

export async function createTask(request: CreateTaskRequest): Promise<TaskItem> {
  const response = await apiClient.post<TaskItem>('/tasks', request)
  return response.data
}

export async function updateTaskStatus(id: number, status: TaskStatus): Promise<TaskItem> {
  const response = await apiClient.patch<TaskItem>(`/tasks/${id}/status`, { status })
  return response.data
}
```

- [ ] **步驟 6：執行 API 用戶端測試**

執行：`Push-Location frontend; try { npm.cmd test -- taskApi.spec.ts } finally { Pop-Location }`

預期：通過；三個 API 請求測試皆成功。

- [ ] **步驟 7：提交前端 API 用戶端**

```bash
git add frontend
git commit -m "feat: add typed task API client"
```

## 任務 6：實作 Pinia 任務 Store

**主要角色：** 前端工程師  
**審查角色：** QA 工程師  
**PM 關卡：** 確認載入、錯誤、篩選、建立及狀態更新均有對應狀態。

**檔案：**
- 建立：`frontend/src/stores/taskStore.ts`
- 建立：`frontend/tests/taskStore.spec.ts`

**介面：**
- 取用：任務 5 的 `getTasks`、`createTask`、`updateTaskStatus`、`TaskItem` 與 `TaskStatus`。
- 產出：包含 `tasks`、`selectedStatus`、`isLoading`、`error`、`fetchTasks`、`addTask`、`changeStatus` 及 `setStatusFilter` 的 `useTaskStore`。

- [ ] **步驟 1：撰寫會失敗的 Store 行為測試**

```ts
// frontend/tests/taskStore.spec.ts
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as taskApi from '../src/api/taskApi'
import { useTaskStore } from '../src/stores/taskStore'

vi.mock('../src/api/taskApi')
const sample = { id: 1, title: 'Test', description: '', status: 'Todo' as const, createdAt: '2026-08-10T00:00:00Z' }

describe('taskStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  it('loads tasks for the selected filter', async () => {
    vi.mocked(taskApi.getTasks).mockResolvedValue([sample])
    const store = useTaskStore()
    await store.setStatusFilter('Todo')
    expect(taskApi.getTasks).toHaveBeenCalledWith('Todo')
    expect(store.tasks).toEqual([sample])
  })

  it('creates a task then reloads the active filter', async () => {
    vi.mocked(taskApi.createTask).mockResolvedValue(sample)
    vi.mocked(taskApi.getTasks).mockResolvedValue([sample])
    const store = useTaskStore()
    await store.addTask({ title: 'Test' })
    expect(taskApi.createTask).toHaveBeenCalledWith({ title: 'Test' })
    expect(store.tasks).toEqual([sample])
  })

  it('refreshes the active filter after a status update', async () => {
    vi.mocked(taskApi.updateTaskStatus).mockResolvedValue({ ...sample, status: 'Done' })
    vi.mocked(taskApi.getTasks).mockResolvedValue([])
    const store = useTaskStore()
    store.tasks = [sample]
    store.selectedStatus = 'Todo'
    await store.changeStatus(1, 'Done')
    expect(taskApi.getTasks).toHaveBeenCalledWith('Todo')
    expect(store.tasks).toEqual([])
  })

  it('stores a readable message when an API request fails', async () => {
    vi.mocked(taskApi.getTasks).mockRejectedValue(new Error('offline'))
    const store = useTaskStore()
    await store.fetchTasks()
    expect(store.error).toBe('Unable to load tasks.')
    expect(store.isLoading).toBe(false)
  })

  it('is loading until the fetch promise settles', async () => {
    let resolve!: (items: Array<typeof sample>) => void
    vi.mocked(taskApi.getTasks).mockReturnValue(new Promise(result => { resolve = result }))
    const store = useTaskStore()
    const pending = store.fetchTasks()
    expect(store.isLoading).toBe(true)
    resolve([])
    await pending
    expect(store.isLoading).toBe(false)
  })

  it('reports create failures', async () => {
    vi.mocked(taskApi.createTask).mockRejectedValue(new Error('offline'))
    const store = useTaskStore()
    await expect(store.addTask({ title: 'Test' })).resolves.toBe(false)
    expect(store.error).toBe('Unable to create task.')
  })

  it('reports status update failures', async () => {
    vi.mocked(taskApi.updateTaskStatus).mockRejectedValue(new Error('offline'))
    const store = useTaskStore()
    await store.changeStatus(1, 'Done')
    expect(store.error).toBe('Unable to update task status.')
  })
})
```

- [ ] **步驟 2：執行 Store 測試並確認其失敗**

執行：`Push-Location frontend; try { npm.cmd test -- taskStore.spec.ts } finally { Pop-Location }`

預期：失敗，因為 `useTaskStore` 尚不存在。

- [ ] **步驟 3：實作 Pinia Store**

```ts
// frontend/src/stores/taskStore.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { createTask, getTasks, updateTaskStatus } from '../api/taskApi'
import type { CreateTaskRequest, TaskItem, TaskStatus } from '../types/task'

export type StatusFilter = 'All' | TaskStatus

export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref<TaskItem[]>([])
  const selectedStatus = ref<StatusFilter>('All')
  const isLoading = ref(false)
  const error = ref('')

  async function fetchTasks(): Promise<void> {
    isLoading.value = true
    error.value = ''
    try {
      tasks.value = await getTasks(selectedStatus.value === 'All' ? undefined : selectedStatus.value)
    } catch {
      error.value = 'Unable to load tasks.'
    } finally {
      isLoading.value = false
    }
  }

  async function setStatusFilter(status: StatusFilter): Promise<void> {
    selectedStatus.value = status
    await fetchTasks()
  }

  async function addTask(request: CreateTaskRequest): Promise<boolean> {
    error.value = ''
    try {
      await createTask(request)
      await fetchTasks()
      return true
    } catch {
      error.value = 'Unable to create task.'
      return false
    }
  }

  async function changeStatus(id: number, status: TaskStatus): Promise<void> {
    error.value = ''
    try {
      await updateTaskStatus(id, status)
      await fetchTasks()
    } catch {
      error.value = 'Unable to update task status.'
    }
  }

  return { tasks, selectedStatus, isLoading, error, fetchTasks, setStatusFilter, addTask, changeStatus }
})
```

- [ ] **步驟 4：執行 Store 測試**

執行：`Push-Location frontend; try { npm.cmd test -- taskStore.spec.ts } finally { Pop-Location }`

預期：通過；涵蓋載入、建立、取代、篩選及錯誤狀態。

- [ ] **步驟 5：提交 Pinia Store**

```bash
git add frontend/src/stores frontend/tests/taskStore.spec.ts
git commit -m "feat: add task state management"
```

## 任務 7：建置 Vue 任務管理 UI

**主要角色：** 前端工程師  
**審查角色：** QA 工程師負責驗收行為；全端工程師負責整合相容性。  
**PM 關卡：** 確認四項使用者功能皆可見、可用，且未加入未要求的功能。

**檔案：**
- 建立：`frontend/src/main.ts`
- 建立：`frontend/src/App.vue`
- 建立：`frontend/tests/App.spec.ts`

**介面：**
- 取用：任務 5–6 的 `useTaskStore`、`StatusFilter` 與 `TaskStatus`。
- 產出：可建立任務、依狀態篩選、顯示欄位及變更狀態的單頁面。

- [ ] **步驟 1：撰寫會失敗的元件驗收測試**

```ts
// frontend/tests/App.spec.ts
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as taskApi from '../src/api/taskApi'
import App from '../src/App.vue'

vi.mock('../src/api/taskApi')

describe('App', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
    vi.mocked(taskApi.getTasks).mockResolvedValue([])
  })

  it('loads tasks on mount and shows the empty state', async () => {
    const wrapper = mount(App, { global: { plugins: [createPinia()] } })
    await vi.waitFor(() => expect(taskApi.getTasks).toHaveBeenCalled())
    expect(wrapper.text()).toContain('No tasks found.')
  })

  it('prevents a whitespace-only title', async () => {
    const wrapper = mount(App, { global: { plugins: [createPinia()] } })
    await wrapper.get('[data-test="title"]').setValue('   ')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.text()).toContain('Title is required.')
    expect(taskApi.createTask).not.toHaveBeenCalled()
  })

  it('submits title, description, and Todo status', async () => {
    vi.mocked(taskApi.createTask).mockResolvedValue({
      id: 1, title: 'Demo', description: 'Show AI workflow', status: 'Todo', createdAt: '2026-08-10T00:00:00Z'
    })
    const wrapper = mount(App, { global: { plugins: [createPinia()] } })
    await wrapper.get('[data-test="title"]').setValue('Demo')
    await wrapper.get('[data-test="description"]').setValue('Show AI workflow')
    await wrapper.get('form').trigger('submit')
    await vi.waitFor(() => expect(taskApi.createTask).toHaveBeenCalledWith({
      title: 'Demo', description: 'Show AI workflow', status: 'Todo'
    }))
  })

  it('requests the selected status filter', async () => {
    const wrapper = mount(App, { global: { plugins: [createPinia()] } })
    await wrapper.get('[data-test="filter"]').setValue('Doing')
    await vi.waitFor(() => expect(taskApi.getTasks).toHaveBeenCalledWith('Doing'))
  })

  it('rejects a 101-character title in the browser', async () => {
    const wrapper = mount(App, { global: { plugins: [createPinia()] } })
    await wrapper.get('[data-test="title"]').setValue('x'.repeat(101))
    await wrapper.get('form').trigger('submit')
    expect(wrapper.text()).toContain('Title must be 100 characters or fewer.')
    expect(taskApi.createTask).not.toHaveBeenCalled()
  })

  it('shows loading and then the empty state', async () => {
    let resolve!: (items: []) => void
    vi.mocked(taskApi.getTasks).mockReturnValue(new Promise(result => { resolve = result }))
    const wrapper = mount(App, { global: { plugins: [createPinia()] } })
    expect(wrapper.text()).toContain('Loading tasks')
    resolve([])
    await vi.waitFor(() => expect(wrapper.text()).toContain('No tasks found.'))
  })

  it('renders task fields and updates status through the API', async () => {
    const item = { id: 7, title: 'Demo', description: '', status: 'Todo' as const, createdAt: '2026-08-10T00:00:00Z' }
    vi.mocked(taskApi.getTasks).mockResolvedValueOnce([item]).mockResolvedValueOnce([])
    vi.mocked(taskApi.updateTaskStatus).mockResolvedValue({ ...item, status: 'Doing' })
    const wrapper = mount(App, { global: { plugins: [createPinia()] } })
    await vi.waitFor(() => expect(wrapper.text()).toContain('Demo'))
    expect(wrapper.text()).toContain('No description')
    expect(wrapper.get('[data-test="created-at-7"]').text()).not.toBe('')
    await wrapper.get('[data-test="task-status-7"]').setValue('Doing')
    await vi.waitFor(() => expect(taskApi.updateTaskStatus).toHaveBeenCalledWith(7, 'Doing'))
  })

  it('shows API errors from load and status update operations', async () => {
    vi.mocked(taskApi.getTasks).mockRejectedValueOnce(new Error('offline'))
    const failedLoad = mount(App, { global: { plugins: [createPinia()] } })
    await vi.waitFor(() => expect(failedLoad.text()).toContain('Unable to load tasks.'))

    const item = { id: 8, title: 'Update me', description: 'Visible', status: 'Todo' as const, createdAt: '2026-08-10T00:00:00Z' }
    vi.mocked(taskApi.getTasks).mockResolvedValue([item])
    vi.mocked(taskApi.updateTaskStatus).mockRejectedValue(new Error('offline'))
    const failedUpdate = mount(App, { global: { plugins: [createPinia()] } })
    await vi.waitFor(() => expect(failedUpdate.text()).toContain('Update me'))
    await failedUpdate.get('[data-test="task-status-8"]').setValue('Done')
    await vi.waitFor(() => expect(failedUpdate.text()).toContain('Unable to update task status.'))
  })

  it('shows an API error when creation fails', async () => {
    vi.mocked(taskApi.createTask).mockRejectedValue(new Error('offline'))
    const wrapper = mount(App, { global: { plugins: [createPinia()] } })
    await wrapper.get('[data-test="title"]').setValue('Cannot create')
    await wrapper.get('form').trigger('submit')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Unable to create task.'))
  })
})
```

- [ ] **步驟 2：執行元件測試並確認其失敗**

執行：`Push-Location frontend; try { npm.cmd test -- App.spec.ts } finally { Pop-Location }`

預期：失敗，因為 `App.vue` 與 `main.ts` 尚不存在。

- [ ] **步驟 3：加入應用程式進入點**

```ts
// frontend/src/main.ts
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).use(createPinia()).mount('#app')
```

- [ ] **步驟 4：依明確行為實作 `App.vue`**

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useTaskStore, type StatusFilter } from './stores/taskStore'
import type { TaskStatus } from './types/task'

const store = useTaskStore()
const { tasks, selectedStatus, isLoading, error } = storeToRefs(store)
const title = ref('')
const description = ref('')
const newStatus = ref<TaskStatus>('Todo')
const validationError = ref('')
const statuses: TaskStatus[] = ['Todo', 'Doing', 'Done']

onMounted(() => store.fetchTasks())

async function submit(): Promise<void> {
  validationError.value = ''
  const trimmedTitle = title.value.trim()
  if (!trimmedTitle) {
    validationError.value = 'Title is required.'
    return
  }
  if (trimmedTitle.length > 100) {
    validationError.value = 'Title must be 100 characters or fewer.'
    return
  }

  const created = await store.addTask({
    title: trimmedTitle,
    description: description.value.trim(),
    status: newStatus.value,
  })
  if (created) {
    title.value = ''
    description.value = ''
    newStatus.value = 'Todo'
  }
}

function filterChanged(event: Event): void {
  store.setStatusFilter((event.target as HTMLSelectElement).value as StatusFilter)
}

function statusChanged(id: number, event: Event): void {
  store.changeStatus(id, (event.target as HTMLSelectElement).value as TaskStatus)
}
</script>

<template>
  <main class="shell">
    <h1>Task Management Demo</h1>

    <form class="card form" @submit.prevent="submit">
      <label>Title <input data-test="title" v-model="title" maxlength="101" /></label>
      <label>Description <textarea data-test="description" v-model="description" /></label>
      <label>Status
        <select v-model="newStatus">
          <option v-for="status in statuses" :key="status" :value="status">{{ status }}</option>
        </select>
      </label>
      <p v-if="validationError" class="error">{{ validationError }}</p>
      <button type="submit">Add task</button>
    </form>

    <section class="toolbar">
      <label>Filter
        <select data-test="filter" :value="selectedStatus" @change="filterChanged">
          <option value="All">All</option>
          <option v-for="status in statuses" :key="status" :value="status">{{ status }}</option>
        </select>
      </label>
    </section>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="isLoading">Loading tasks…</p>
    <p v-else-if="tasks.length === 0">No tasks found.</p>
    <ul v-else class="tasks">
      <li v-for="task in tasks" :key="task.id" class="card">
        <div>
          <h2>{{ task.title }}</h2>
          <p>{{ task.description || 'No description' }}</p>
          <small :data-test="`created-at-${task.id}`">{{ new Date(task.createdAt).toLocaleString() }}</small>
        </div>
        <select :data-test="`task-status-${task.id}`" :value="task.status" @change="statusChanged(task.id, $event)">
          <option v-for="status in statuses" :key="status" :value="status">{{ status }}</option>
        </select>
      </li>
    </ul>
  </main>
</template>

<style scoped>
:global(*) { box-sizing: border-box; }
:global(body) { margin: 0; background: #f5f7fb; color: #172033; font-family: Inter, system-ui, sans-serif; }
.shell { width: min(760px, calc(100% - 32px)); margin: 48px auto; }
.card { padding: 20px; border: 1px solid #dfe4ee; border-radius: 12px; background: white; }
.form { display: grid; gap: 14px; }
label { display: grid; gap: 6px; font-weight: 600; }
input, textarea, select, button { padding: 10px 12px; border: 1px solid #bdc6d8; border-radius: 8px; font: inherit; }
button { cursor: pointer; border-color: #3157d5; background: #3157d5; color: white; }
.toolbar { display: flex; justify-content: flex-end; margin: 24px 0 12px; }
.tasks { display: grid; gap: 12px; padding: 0; list-style: none; }
.tasks li { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.tasks h2 { margin: 0 0 8px; font-size: 1.1rem; }
.tasks p { margin: 0 0 8px; }
.error { color: #b42318; }
</style>
```

- [ ] **步驟 5：執行前端測試與正式環境建置**

執行：

```powershell
Push-Location frontend
try {
  npm.cmd test
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  npm.cmd run build
} finally {
  Pop-Location
}
```

預期：通過；所有 API、Store 與元件測試皆成功，且 Vite 產生 `frontend/dist` 時沒有 TypeScript 錯誤。

- [ ] **步驟 6：提交 UI**

```bash
git add frontend/src frontend/tests/App.spec.ts
git commit -m "feat: add task management interface"
```

## 任務 8：記錄並驗證整合後的示範系統

**主要角色：** QA 工程師  
**支援角色：** 全端工程師與前端工程師各自在所屬檔案修正缺陷；PM 負責最終驗收。  
**PM 關卡：** 每項驗收條件都必須具備自動化證據或明確的瀏覽器／API 冒煙測試結果。

**檔案：**
- 建立：`SPEC.md`
- 僅在驗證發現缺陷時修改：任務 1–7 的檔案及直接對應的測試。

**介面：**
- 取用：位於 `http://localhost:5000` 的後端及位於 `http://localhost:5173` 的前端。
- 產出：可重現的設定命令與所有驗收條件通過的證據。

- [ ] **步驟 1：撰寫包含需求與執行指示的 `SPEC.md`**

````markdown
# 任務管理示範

## 功能

- Query all tasks or filter by Todo, Doing, or Done.
- Create a task with title, optional description, and status.
- Change an existing task's status.
- Reject blank titles, titles longer than 100 characters, and unknown statuses.

## 啟動後端

```powershell
dotnet restore backend/AiTaskDemo.Api.csproj
dotnet run --project backend/AiTaskDemo.Api.csproj --urls http://localhost:5000
```

## 啟動前端

```powershell
Set-Location frontend
npm.cmd ci
npm.cmd run dev
```

開啟 `http://localhost:5173`。

## 測試

```powershell
dotnet test backend.tests/AiTaskDemo.Api.Tests.csproj
Set-Location frontend
npm.cmd test
npm.cmd run build
```

SQLite 資料儲存在 `backend/tasks.db`，後端啟動時會自動建立。
````

- [ ] **步驟 2：執行完整自動化驗證**

從儲存庫根目錄執行：

```powershell
dotnet restore backend.tests/AiTaskDemo.Api.Tests.csproj
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
dotnet test backend.tests/AiTaskDemo.Api.Tests.csproj
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
dotnet build backend/AiTaskDemo.Api.csproj
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Push-Location frontend
try {
  npm.cmd ci
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  npm.cmd test
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  npm.cmd run build
} finally {
  Pop-Location
}
```

預期：所有 xUnit 與 Vitest 測試通過；後端與前端建置皆以結束碼 0 完成。

- [ ] **步驟 3：啟動後端並手動驗證 API 驗收條件**

在隱藏處理程序中啟動後端，並保留其處理程序 ID 以供清理：

```powershell
$backendProcess = Start-Process dotnet -ArgumentList @(
  'run', '--project', 'backend/AiTaskDemo.Api.csproj', '--urls', 'http://localhost:5000'
) -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 3
if ($backendProcess.HasExited) { throw 'Backend failed to start.' }
```

在第二個 PowerShell 終端機執行：

```powershell
$createdResponse = Invoke-WebRequest -UseBasicParsing -Method Post -Uri 'http://localhost:5000/api/tasks' -ContentType 'application/json' -Body '{"title":"Demo task","description":"Verify the flow","status":"Todo"}'
if ([int]$createdResponse.StatusCode -ne 201) { throw "Expected POST 201, got $($createdResponse.StatusCode)" }
$created = $createdResponse.Content | ConvertFrom-Json
if ($created.title -ne 'Demo task' -or $created.status -ne 'Todo') { throw 'POST response fields are incorrect.' }

$todoItems = Invoke-RestMethod -Method Get -Uri 'http://localhost:5000/api/tasks?status=Todo'
if ($created.id -notin $todoItems.id) { throw 'Filtered GET did not return the created task.' }

$patchResponse = Invoke-WebRequest -UseBasicParsing -Method Patch -Uri "http://localhost:5000/api/tasks/$($created.id)/status" -ContentType 'application/json' -Body '{"status":"Done"}'
if ([int]$patchResponse.StatusCode -ne 200) { throw "Expected PATCH 200, got $($patchResponse.StatusCode)" }
$updated = $patchResponse.Content | ConvertFrom-Json
if ($updated.id -ne $created.id -or $updated.status -ne 'Done') { throw 'PATCH response fields are incorrect.' }
```

預期：POST 回傳一項 `status: "Todo"` 的任務；篩選後的 GET 包含該任務；PATCH 回傳同一項 `status: "Done"` 的任務。

- [ ] **步驟 4：手動驗證兩項驗證驗收條件**

```powershell
function Get-ErrorStatus([scriptblock]$Request) {
  try {
    & $Request | Out-Null
    return 200
  } catch {
    return [int]$_.Exception.Response.StatusCode
  }
}

$longTitle = 'x' * 101
$checks = @(
  Get-ErrorStatus { Invoke-WebRequest -UseBasicParsing -Method Post -Uri 'http://localhost:5000/api/tasks' -ContentType 'application/json' -Body '{"title":"   "}' }
  Get-ErrorStatus { Invoke-WebRequest -UseBasicParsing -Method Post -Uri 'http://localhost:5000/api/tasks' -ContentType 'application/json' -Body (@{ title = $longTitle } | ConvertTo-Json) }
  Get-ErrorStatus { Invoke-WebRequest -UseBasicParsing -Method Get -Uri 'http://localhost:5000/api/tasks?status=Blocked' }
  Get-ErrorStatus { Invoke-WebRequest -UseBasicParsing -Method Post -Uri 'http://localhost:5000/api/tasks' -ContentType 'application/json' -Body '{"title":"Bad","status":99}' }
  Get-ErrorStatus { Invoke-WebRequest -UseBasicParsing -Method Patch -Uri "http://localhost:5000/api/tasks/$($created.id)/status" -ContentType 'application/json' -Body '{"status":"Blocked"}' }
)
if ($checks | Where-Object { $_ -ne 400 }) { throw "Expected all validation requests to return 400; got $checks" }
```

預期：五個無效請求皆回傳 `400`。

- [ ] **步驟 5：啟動前端並完成瀏覽器冒煙測試**

執行：

```powershell
$frontendProcess = Start-Process npm.cmd -ArgumentList @('run', 'dev') -WorkingDirectory (Join-Path $PWD 'frontend') -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 3
if ($frontendProcess.HasExited) { throw 'Frontend failed to start.' }
```

在 `http://localhost:5173` 的預期結果：

1. 確認初始清單穩定前會顯示載入指示器。
2. 新增任務，並在「全部」清單驗證其標題、說明、Todo 狀態及建立時間。
3. 仍在檢視「全部」時，將新任務改為 Doing。
4. 選取 Doing 並確認更新後的任務出現；選取 Todo 並確認其不出現。
5. 選取沒有結果的篩選條件，確認顯示 `No tasks found.`。
6. 送出空白標題，確認未呼叫 API 且顯示 `Title is required.`。
7. 輸入 101 個字元，確認顯示 `Title must be 100 characters or fewer.`。
8. 以 `Stop-Process -Id $backendProcess.Id` 停止後端，重新載入前端，確認顯示 `Unable to load tasks.`。

冒煙測試後清理已記錄的處理程序：

```powershell
Stop-Process -Id $frontendProcess.Id -ErrorAction SilentlyContinue
Stop-Process -Id $backendProcess.Id -ErrorAction SilentlyContinue
```

- [ ] **步驟 6：提交文件與最終已驗證狀態**

```bash
git add SPEC.md backend backend.tests frontend
git commit -m "docs: add task demo setup and verification"
```
