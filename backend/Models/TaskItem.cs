namespace AiTaskDemo.Api.Models;

public enum TaskStatus
{
    Todo,
    Doing,
    Done
}

public sealed class TaskItem
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public string Description { get; set; } = string.Empty;
    public TaskStatus Status { get; set; } = TaskStatus.Todo;
    public DateTime CreatedAt { get; set; }
}
