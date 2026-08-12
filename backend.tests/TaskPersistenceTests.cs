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
            var user = new User
            {
                Username = "persistence_user",
                PasswordHash = "hash"
            };
            writeContext.Users.Add(user);
            await writeContext.SaveChangesAsync();

            writeContext.Tasks.Add(new TaskItem
            {
                Title = "Review generated code",
                Description = "Check API behavior",
                Status = TaskState.Doing,
                CreatedAt = new DateTime(2026, 8, 10, 8, 0, 0, DateTimeKind.Utc),
                UserId = user.Id
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
