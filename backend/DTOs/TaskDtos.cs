using System.ComponentModel.DataAnnotations;
using TaskState = AiTaskDemo.Api.Models.TaskStatus;

namespace AiTaskDemo.Api.DTOs;

public sealed record CreateTaskRequest(
    [param: Required, MaxLength(100)] string? Title,
    string? Description,
    TaskState? Status);

public sealed record UpdateTaskStatusRequest(TaskState? Status);

public sealed record TaskResponse(
    int Id,
    string Title,
    string Description,
    TaskState Status,
    DateTime CreatedAt);
