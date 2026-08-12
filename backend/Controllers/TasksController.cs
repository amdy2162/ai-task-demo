using AiTaskDemo.Api.DTOs;
using AiTaskDemo.Api.Hubs;
using AiTaskDemo.Api.Models;
using AiTaskDemo.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using TaskState = AiTaskDemo.Api.Models.TaskStatus;

namespace AiTaskDemo.Api.Controllers;

[ApiController]
[Route("api/tasks")]
public sealed class TasksController(TaskService service, IHubContext<TaskHub> hubContext) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TaskResponse>>> GetAll(
        [FromQuery] TaskState? status,
        [FromQuery] string? search,
        [FromQuery] string? sortBy,
        [FromQuery] string? sortOrder,
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

        var items = await service.GetAllAsync(status, search, sortBy, sortOrder, cancellationToken);
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

        var response = ToResponse(item);
        await hubContext.Clients.All.SendAsync("TaskCreated", response, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, response);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<TaskResponse>> Update(
        int id,
        UpdateTaskRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            ModelState.AddModelError(nameof(request.Title), "Title is required.");
            return ValidationProblem(ModelState);
        }

        if (request.Status is null || !Enum.IsDefined(request.Status.Value))
        {
            ModelState.AddModelError(nameof(request.Status), "Status must be Todo, Doing, or Done.");
            return ValidationProblem(ModelState);
        }

        var item = await service.UpdateAsync(
            id,
            request.Title,
            request.Description,
            request.Status.Value,
            cancellationToken);

        if (item is null)
        {
            return NotFound();
        }

        var response = ToResponse(item);
        await hubContext.Clients.All.SendAsync("TaskUpdated", response, cancellationToken);
        return Ok(response);
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
        if (item is null)
        {
            return NotFound();
        }

        var response = ToResponse(item);
        await hubContext.Clients.All.SendAsync("TaskUpdated", response, cancellationToken);
        return Ok(response);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(
        int id,
        CancellationToken cancellationToken)
    {
        var deleted = await service.DeleteAsync(id, cancellationToken);
        if (!deleted)
        {
            return NotFound();
        }

        await hubContext.Clients.All.SendAsync("TaskDeleted", id, cancellationToken);
        return NoContent();
    }

    private static TaskResponse ToResponse(TaskItem item) =>
        new(item.Id, item.Title, item.Description, item.Status, item.CreatedAt);
}
