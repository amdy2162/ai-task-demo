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
