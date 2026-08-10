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
