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
    public async Task<ActionResult<PagedResult<TaskResponse>>> GetAll(
        [FromQuery] string? status,
        [FromQuery] string? search,
        [FromQuery] string? sortBy,
        [FromQuery] string? sortOrder,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        if (page < 1)
        {
            ModelState.AddModelError(nameof(page), "Page must be greater than or equal to 1.");
            return ValidationProblem(ModelState);
        }

        if (pageSize < 1 || pageSize > 100)
        {
            ModelState.AddModelError(nameof(pageSize), "PageSize must be between 1 and 100.");
            return ValidationProblem(ModelState);
        }

        TaskState? taskStatus = null;
        if (Request.Query.TryGetValue("status", out var rawStatus))
        {
            if (rawStatus.Count != 1 || !TaskStatusValidation.TryParse(rawStatus[0], out var parsedStatus))
            {
                ModelState.AddModelError(nameof(status), "Status must be Todo, Doing, or Done.");
                return ValidationProblem(ModelState);
            }
            taskStatus = parsedStatus;
        }

        var (items, totalCount) = await service.GetPagedAsync(taskStatus, search, sortBy, sortOrder, page, pageSize, cancellationToken);
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);
        var responses = items.Select(ToResponse).ToList();

        var result = new PagedResult<TaskResponse>(responses, totalCount, page, pageSize, totalPages);
        return Ok(result);
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
