using AiTaskDemo.Api.Data;
using AiTaskDemo.Api.Models;
using Microsoft.EntityFrameworkCore;
using TaskState = AiTaskDemo.Api.Models.TaskStatus;

namespace AiTaskDemo.Api.Services;

public sealed class TaskService(AppDbContext db)
{
    private static readonly TimeSpan TaipeiOffset = TimeSpan.FromHours(8);

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
                EF.Functions.Like(item.Title, $"%{keyword}%") ||
                EF.Functions.Like(item.Description, $"%{keyword}%"));
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

    public async Task<bool> DeleteAsync(int id, CancellationToken cancellationToken)
    {
        var item = await db.Tasks.FindAsync([id], cancellationToken);
        if (item is null)
        {
            return false;
        }

        db.Tasks.Remove(item);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }
}
