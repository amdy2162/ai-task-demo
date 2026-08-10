using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using AiTaskDemo.Api.Data;
using AiTaskDemo.Api.DTOs;
using AiTaskDemo.Api.Models;
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
