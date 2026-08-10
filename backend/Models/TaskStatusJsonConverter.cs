using System.Text.Json;
using System.Text.Json.Serialization;

namespace AiTaskDemo.Api.Models;

public sealed class TaskStatusJsonConverter : JsonConverter<TaskStatus>
{
    public override TaskStatus Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) =>
        reader.TokenType == JsonTokenType.String && TaskStatusValidation.TryParse(reader.GetString(), out var status)
            ? status
            : throw new JsonException("Status must be Todo, Doing, or Done.");

    public override void Write(Utf8JsonWriter writer, TaskStatus value, JsonSerializerOptions options) =>
        writer.WriteStringValue(value switch
        {
            TaskStatus.Todo => "Todo",
            TaskStatus.Doing => "Doing",
            TaskStatus.Done => "Done",
            _ => throw new JsonException("Status must be Todo, Doing, or Done.")
        });
}

public static class TaskStatusValidation
{
    public static bool TryParse(string? value, out TaskStatus status)
    {
        switch (value)
        {
            case "Todo": status = TaskStatus.Todo; return true;
            case "Doing": status = TaskStatus.Doing; return true;
            case "Done": status = TaskStatus.Done; return true;
            default: status = default; return false;
        }
    }
}
