using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
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
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter(allowIntegerValues: false) }
    };

    [Fact]
    public async Task Get_returns_tasks_newest_first()
    {
        await SeedAsync(
            NewItem("Older", TaskState.Todo, new DateTime(2026, 8, 9, 8, 0, 0, DateTimeKind.Utc)),
            NewItem("Newer", TaskState.Done, new DateTime(2026, 8, 10, 8, 0, 0, DateTimeKind.Utc)));

        var items = await factory.CreateClient()
            .GetFromJsonAsync<List<TaskResponse>>("/api/tasks", JsonOptions);

        Assert.Equal(new[] { "Newer", "Older" }, items!.Select(x => x.Title));
    }

    [Fact]
    public async Task Get_filters_by_status()
    {
        await SeedAsync(
            NewItem("Todo item", TaskState.Todo, DateTime.UtcNow),
            NewItem("Doing item", TaskState.Doing, DateTime.UtcNow));

        var items = await factory.CreateClient()
            .GetFromJsonAsync<List<TaskResponse>>("/api/tasks?status=Doing", JsonOptions);

        var item = Assert.Single(items!);
        Assert.Equal("Doing item", item.Title);
        Assert.Equal(TaskState.Doing, item.Status);
    }

    [Fact]
    public async Task Get_rejects_empty_status()
    {
        var response = await factory.CreateClient().GetAsync("/api/tasks?status=");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData("Blocked")]
    [InlineData("99")]
    public async Task Get_rejects_unknown_status(string status)
    {
        var response = await factory.CreateClient().GetAsync($"/api/tasks?status={status}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Post_creates_task_and_defaults_status_to_todo()
    {
        var response = await factory.CreateClient().PostAsJsonAsync("/api/tasks", new
        {
            title = "Write tests",
            description = "Cover the API"
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var item = await response.Content.ReadFromJsonAsync<TaskResponse>(JsonOptions);
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
        var item = await response.Content.ReadFromJsonAsync<TaskResponse>(JsonOptions);
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
        var item = await response.Content.ReadFromJsonAsync<TaskResponse>(JsonOptions);
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
