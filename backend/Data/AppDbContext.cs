using AiTaskDemo.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AiTaskDemo.Api.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<TaskItem> Tasks => Set<TaskItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var task = modelBuilder.Entity<TaskItem>();
        task.Property(x => x.Title).HasMaxLength(100).IsRequired();
        task.Property(x => x.Description).IsRequired();
        task.Property(x => x.Status).HasConversion<string>().IsRequired();
        task.Property(x => x.CreatedAt).IsRequired();
    }
}
