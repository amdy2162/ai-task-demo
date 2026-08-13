using AiTaskDemo.Api.Data;
using AiTaskDemo.Api.Models;
using Microsoft.EntityFrameworkCore;
using TaskState = AiTaskDemo.Api.Models.TaskStatus;

namespace AiTaskDemo.Api.Services;

public sealed class TaskService(AppDbContext db)
{
    private static readonly TimeSpan TaipeiOffset = TimeSpan.FromHours(8);

    public async Task<(List<TaskItem> Items, int TotalCount)> GetPagedAsync(
        TaskState? status,
        string? search,
        string? sortBy,
        string? sortOrder,
        int page,
        int pageSize,
        int userId,
        CancellationToken cancellationToken)
    {
        var query = db.Tasks.AsNoTracking().Where(item => item.UserId == userId);

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


    public async Task<TaskItem> CreateAsync(
        string title,
        string? description,
        TaskState? status,
        int userId,
        CancellationToken cancellationToken)
    {
        var item = new TaskItem
        {
            Title = title.Trim(),
            Description = description?.Trim() ?? string.Empty,
            Status = status ?? TaskState.Todo,
            CreatedAt = DateTime.UtcNow.Add(TaipeiOffset),
            UserId = userId
        };

        db.Tasks.Add(item);
        await db.SaveChangesAsync(cancellationToken);
        return item;
    }

    public async Task<TaskItem?> UpdateStatusAsync(
        int id,
        TaskState status,
        int userId,
        CancellationToken cancellationToken)
    {
        var item = await db.Tasks.FindAsync([id], cancellationToken);
        if (item is null || item.UserId != userId)
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
        TaskState? status,
        int userId,
        CancellationToken cancellationToken)
    {
        var item = await db.Tasks.FindAsync([id], cancellationToken);
        if (item is null || item.UserId != userId)
        {
            return null;
        }

        item.Title = title.Trim();
        item.Description = description?.Trim() ?? string.Empty;
        if (status is not null)
        {
            item.Status = status.Value;
        }
        await db.SaveChangesAsync(cancellationToken);
        return item;
    }

    public async Task<bool> DeleteAsync(int id, int userId, CancellationToken cancellationToken)
    {
        var item = await db.Tasks.FindAsync([id], cancellationToken);
        if (item is null || item.UserId != userId)
        {
            return false;
        }

        db.Tasks.Remove(item);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }
}
