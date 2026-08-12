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
        if (Request.Query.TryGetValue("status", out var rawStatus) &&
            (rawStatus.Count != 1 || !TaskStatusValidation.TryParse(rawStatus[0], out _)))
        {
            ModelState.AddModelError(nameof(status), "Status must be Todo, Doing, or Done.");
            return ValidationProblem(ModelState);
        }

        if (status is not null && !Enum.IsDefined(status.Value))
        {
            ModelState.AddModelError(nameof(status), "Status must be Todo, Doing, or Done.");
            return ValidationProblem(ModelState);
        }

        var items = await service.GetAllAsync(status, cancellationToken);
        return Ok(items.Select(ToResponse));
    }

    [HttpPost]
    public async Task<ActionResult<TaskResponse>> Create(
        CreateTaskRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            ModelState.AddModelError(nameof(request.Title), "Title is required.");
            return ValidationProblem(ModelState);
        }

        if (request.Status is not null && !Enum.IsDefined(request.Status.Value))
        {
            ModelState.AddModelError(nameof(request.Status), "Status must be Todo, Doing, or Done.");
            return ValidationProblem(ModelState);
        }

        var item = await service.CreateAsync(
            request.Title,
            request.Description,
            request.Status,
            cancellationToken);

        return StatusCode(StatusCodes.Status201Created, ToResponse(item));
    }

    [HttpPatch("{id:int}/status")]
    public async Task<ActionResult<TaskResponse>> UpdateStatus(
        int id,
        UpdateTaskStatusRequest request,
        CancellationToken cancellationToken)
    {
        if (request.Status is null || !Enum.IsDefined(request.Status.Value))
        {
            ModelState.AddModelError(nameof(request.Status), "Status must be Todo, Doing, or Done.");
            return ValidationProblem(ModelState);
        }

        var item = await service.UpdateStatusAsync(id, request.Status.Value, cancellationToken);
        return item is null ? NotFound() : Ok(ToResponse(item));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(
        int id,
        CancellationToken cancellationToken)
    {
        var deleted = await service.DeleteAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }

    private static TaskResponse ToResponse(TaskItem item) =>
        new(item.Id, item.Title, item.Description, item.Status, item.CreatedAt);
}
