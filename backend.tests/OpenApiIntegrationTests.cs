using AiTaskDemo.Api.Controllers;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace AiTaskDemo.Api.Tests;

public sealed class OpenApiIntegrationTests
{
    [Fact]
    public async Task Serves_the_OpenAPI_document_in_development()
    {
        await using var factory = new WebApplicationFactory<WeatherForecastController>()
            .WithWebHostBuilder(builder => builder.UseEnvironment("Development"));
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/openapi/v1.json");

        response.EnsureSuccessStatusCode();
    }
}
