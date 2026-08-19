using AiTaskDemo.Api.Data;
using AiTaskDemo.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;
using TaskState = AiTaskDemo.Api.Models.TaskStatus;

namespace AiTaskDemo.Api.Services;

public sealed class TaskService(AppDbContext db, IDistributedCache cache)
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
        string userRole,
        CancellationToken cancellationToken)
    {
        // 1. 產生這個查詢專屬的 Cache Key
        var cacheKey = $"Tasks_{userRole}_{userId}_{status}_{search}_{sortBy}_{sortOrder}_{page}_{pageSize}";
        
        // 2. 先去快取找找看
        var cachedData = await cache.GetStringAsync(cacheKey, cancellationToken);
        if (!string.IsNullOrEmpty(cachedData))
        {
            // 如果快取有資料，直接回傳！(速度極快)
            return JsonSerializer.Deserialize<(List<TaskItem>, int)>(cachedData);
        }

        // 3. 如果快取沒有，才去資料庫查詢
        var query = db.Tasks.AsNoTracking();
        if (userRole != UserRole.Admin.ToString())
        {
            query = query.Where(item => item.UserId == userId);
        }

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

        var result = (items, totalCount);

        // 4. 把查到的結果存進快取，設定 15 秒後過期
        var options = new DistributedCacheEntryOptions()
            .SetAbsoluteExpiration(TimeSpan.FromSeconds(15));
        await cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(result), options, cancellationToken);

        return result;
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
        string userRole,
        CancellationToken cancellationToken)
    {
        var item = await db.Tasks.FindAsync([id], cancellationToken);
        if (item is null || (userRole != UserRole.Admin.ToString() && item.UserId != userId))
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
        string userRole,
        CancellationToken cancellationToken)
    {
        var item = await db.Tasks.FindAsync([id], cancellationToken);
        if (item is null || (userRole != UserRole.Admin.ToString() && item.UserId != userId))
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

    public async Task<bool> DeleteAsync(int id, int userId, string userRole, CancellationToken cancellationToken)
    {
        var item = await db.Tasks.FindAsync([id], cancellationToken);
        if (item is null || (userRole != UserRole.Admin.ToString() && item.UserId != userId))
        {
            return false;
        }

        db.Tasks.Remove(item);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }
}
