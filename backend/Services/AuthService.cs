using System;
using System.Threading.Tasks;
using AiTaskDemo.Api.Data;
using AiTaskDemo.Api.DTOs;
using AiTaskDemo.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace AiTaskDemo.Api.Services;

public sealed class AuthService(AppDbContext dbContext, JwtTokenService tokenService)
{
    private readonly PasswordHasher<User> _passwordHasher = new();

    public async Task<AuthResponse?> RegisterAsync(string username, string password)
    {
        var exists = await dbContext.Users.AnyAsync(u => u.Username.ToLower() == username.ToLower());
        if (exists)
        {
            return null;
        }

        var user = new User
        {
            Username = username,
            PasswordHash = string.Empty,
            CreatedAt = DateTime.UtcNow
        };

        user.PasswordHash = _passwordHasher.HashPassword(user, password);

        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync();

        var token = tokenService.GenerateToken(user);
        return new AuthResponse(token, new UserProfileResponse(user.Id, user.Username, user.CreatedAt));
    }

    public async Task<AuthResponse?> LoginAsync(string username, string password)
    {
        var user = await dbContext.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == username.ToLower());
        if (user == null)
        {
            return null;
        }

        var verificationResult = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, password);
        if (verificationResult == PasswordVerificationResult.Failed)
        {
            return null;
        }

        var token = tokenService.GenerateToken(user);
        return new AuthResponse(token, new UserProfileResponse(user.Id, user.Username, user.CreatedAt));
    }

    public async Task<UserProfileResponse?> GetUserProfileAsync(int userId)
    {
        var user = await dbContext.Users.FindAsync(userId);
        if (user == null)
        {
            return null;
        }

        return new UserProfileResponse(user.Id, user.Username, user.CreatedAt);
    }
}
