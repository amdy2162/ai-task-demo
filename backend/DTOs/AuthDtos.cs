using System;
using System.ComponentModel.DataAnnotations;

namespace AiTaskDemo.Api.DTOs;

public sealed record RegisterRequest(
    [param: Required, MinLength(3), MaxLength(50)] string Username,
    [param: Required, MinLength(6)] string Password);

public sealed record LoginRequest(
    [param: Required] string Username,
    [param: Required] string Password);

public sealed record UserProfileResponse(
    int Id,
    string Username,
    DateTime CreatedAt);

public sealed record AuthResponse(
    string Token,
    UserProfileResponse User);
