using System;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using AiTaskDemo.Api.Data;
using AiTaskDemo.Api.DTOs;
using AiTaskDemo.Api.Models;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace AiTaskDemo.Api.Tests;

public sealed class AuthApiTests(CustomWebApplicationFactory factory)
    : IClassFixture<CustomWebApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private async Task ClearDatabaseAsync()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Tasks.RemoveRange(db.Tasks);
        db.Users.RemoveRange(db.Users);
        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task Register_successfully_creates_user_and_returns_token()
    {
        await ClearDatabaseAsync();
        var client = factory.CreateClient();
        var request = new RegisterRequest("testuser", "securepassword123");

        var response = await client.PostAsJsonAsync("/api/auth/register", request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var authResponse = await response.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions);
        Assert.NotNull(authResponse);
        Assert.False(string.IsNullOrWhiteSpace(authResponse.Token));
        Assert.Equal("testuser", authResponse.User.Username);
        Assert.True(authResponse.User.Id > 0);
    }

    [Fact]
    public async Task Register_duplicate_username_returns_conflict()
    {
        await ClearDatabaseAsync();
        var client = factory.CreateClient();
        
        // Register first time
        var request1 = new RegisterRequest("duplicateuser", "password123");
        var response1 = await client.PostAsJsonAsync("/api/auth/register", request1);
        Assert.Equal(HttpStatusCode.Created, response1.StatusCode);

        // Register duplicate
        var request2 = new RegisterRequest("duplicateuser", "differentpassword");
        var response2 = await client.PostAsJsonAsync("/api/auth/register", request2);
        Assert.Equal(HttpStatusCode.Conflict, response2.StatusCode);
    }

    [Theory]
    [InlineData("", "password")]
    [InlineData("us", "password")]
    [InlineData("user", "pass")]
    [InlineData("user", "")]
    public async Task Register_invalid_arguments_returns_bad_request(string username, string password)
    {
        await ClearDatabaseAsync();
        var client = factory.CreateClient();
        var request = new RegisterRequest(username, password);

        var response = await client.PostAsJsonAsync("/api/auth/register", request);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Login_successfully_returns_token()
    {
        await ClearDatabaseAsync();
        var client = factory.CreateClient();
        
        // Register user
        var registerRequest = new RegisterRequest("loginuser", "password123");
        await client.PostAsJsonAsync("/api/auth/register", registerRequest);

        // Login
        var loginRequest = new LoginRequest("loginuser", "password123");
        var response = await client.PostAsJsonAsync("/api/auth/login", loginRequest);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var authResponse = await response.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions);
        Assert.NotNull(authResponse);
        Assert.False(string.IsNullOrWhiteSpace(authResponse.Token));
        Assert.Equal("loginuser", authResponse.User.Username);
    }

    [Fact]
    public async Task Login_wrong_password_returns_unauthorized()
    {
        await ClearDatabaseAsync();
        var client = factory.CreateClient();

        // Register user
        var registerRequest = new RegisterRequest("wrongpassuser", "password123");
        await client.PostAsJsonAsync("/api/auth/register", registerRequest);

        // Login with wrong password
        var loginRequest = new LoginRequest("wrongpassuser", "wrongpassword");
        var response = await client.PostAsJsonAsync("/api/auth/login", loginRequest);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Accessing_me_authenticated_returns_profile()
    {
        await ClearDatabaseAsync();
        var client = factory.CreateClient();

        // Register
        var registerRequest = new RegisterRequest("profileuser", "password123");
        var registerResponse = await client.PostAsJsonAsync("/api/auth/register", registerRequest);
        var authResult = await registerResponse.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions);
        Assert.NotNull(authResult);

        // Set auth header
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", authResult.Token);

        // Call /me
        var meResponse = await client.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.OK, meResponse.StatusCode);

        var profile = await meResponse.Content.ReadFromJsonAsync<UserProfileResponse>(JsonOptions);
        Assert.NotNull(profile);
        Assert.Equal("profileuser", profile.Username);
        Assert.Equal(authResult.User.Id, profile.Id);
    }

    [Fact]
    public async Task Accessing_me_unauthenticated_returns_unauthorized()
    {
        await ClearDatabaseAsync();
        var client = factory.CreateClient();

        var meResponse = await client.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, meResponse.StatusCode);
    }
}
