using AiTaskDemo.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AiTaskDemo.Api.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<TaskItem> Tasks => Set<TaskItem>();
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var task = modelBuilder.Entity<TaskItem>();
        task.Property(x => x.Title).HasMaxLength(100).IsRequired();
        task.Property(x => x.Description).IsRequired();
        task.Property(x => x.Status).HasConversion<string>().IsRequired();
        task.Property(x => x.CreatedAt).IsRequired();

        var user = modelBuilder.Entity<User>();
        user.HasIndex(u => u.Username).IsUnique();
        user.Property(u => u.Username).HasMaxLength(50).IsRequired();
        user.Property(u => u.PasswordHash).IsRequired();
        user.Property(u => u.CreatedAt).IsRequired();
    }
}
