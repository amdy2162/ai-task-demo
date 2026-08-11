using AiTaskDemo.Api.Data;
using AiTaskDemo.Api.Models;
using Microsoft.EntityFrameworkCore;
using TaskState = AiTaskDemo.Api.Models.TaskStatus;

namespace AiTaskDemo.Api.Services;

public sealed class TaskService(AppDbContext db)
{
    private static readonly TimeSpan TaipeiOffset = TimeSpan.FromHours(8);

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
            CreatedAt = DateTime.UtcNow.Add(TaipeiOffset)
        };

        db.Tasks.Add(item);
        await db.SaveChangesAsync(cancellationToken);
        return item;
    }

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
}
