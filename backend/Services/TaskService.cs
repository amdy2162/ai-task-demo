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
}
