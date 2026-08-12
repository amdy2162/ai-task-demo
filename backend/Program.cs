using AiTaskDemo.Api.Data;
using AiTaskDemo.Api.Hubs;
using AiTaskDemo.Api.Middleware;
using AiTaskDemo.Api.Models;
using AiTaskDemo.Api.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers().AddJsonOptions(options =>
    options.JsonSerializerOptions.Converters.Add(new TaskStatusJsonConverter()));
builder.Services.AddSignalR();
builder.Services.AddOpenApi();
var databasePath = Path.Combine(builder.Environment.ContentRootPath, "tasks.db");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite($"Data Source={databasePath}"));
builder.Services.AddScoped<TaskService>();
builder.Services.AddCors(options => options.AddPolicy("Frontend", policy =>
    policy.WithOrigins(
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "https://amdy2162.github.io"
    )
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()));

var app = builder.Build();
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseMiddleware<GlobalExceptionMiddleware>();
app.UseCors("Frontend");
app.UseAuthorization();
app.MapControllers();
app.MapHub<TaskHub>("/hubs/tasks");

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if (db.Database.IsRelational())
    {
        db.Database.Migrate();
    }
    else
    {
        db.Database.EnsureCreated();
    }
}

app.Run();

public partial class Program { }
