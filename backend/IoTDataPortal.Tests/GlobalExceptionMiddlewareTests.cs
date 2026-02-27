using System.Net;
using System.Text.Json;
using IoTDataPortal.API.Middleware;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;

namespace IoTDataPortal.Tests;

public class GlobalExceptionMiddlewareTests
{
    [Fact]
    public async Task InvokeAsync_UnauthorizedAccessException_ReturnsStandardizedUnauthorizedPayload()
    {
        var middleware = new GlobalExceptionMiddleware(
            _ => throw new UnauthorizedAccessException(),
            NullLogger<GlobalExceptionMiddleware>.Instance);

        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        await middleware.InvokeAsync(context);

        Assert.Equal((int)HttpStatusCode.Unauthorized, context.Response.StatusCode);

        context.Response.Body.Position = 0;
        using var doc = await JsonDocument.ParseAsync(context.Response.Body);

        Assert.Equal((int)HttpStatusCode.Unauthorized, doc.RootElement.GetProperty("statusCode").GetInt32());
        Assert.Equal("Unauthorized access", doc.RootElement.GetProperty("message").GetString());
        Assert.True(doc.RootElement.TryGetProperty("timestamp", out _));
    }

    [Fact]
    public async Task InvokeAsync_UnknownException_ReturnsStandardizedInternalServerErrorPayload()
    {
        var middleware = new GlobalExceptionMiddleware(
            _ => throw new InvalidOperationException("boom"),
            NullLogger<GlobalExceptionMiddleware>.Instance);

        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        await middleware.InvokeAsync(context);

        Assert.Equal((int)HttpStatusCode.InternalServerError, context.Response.StatusCode);

        context.Response.Body.Position = 0;
        using var doc = await JsonDocument.ParseAsync(context.Response.Body);

        Assert.Equal((int)HttpStatusCode.InternalServerError, doc.RootElement.GetProperty("statusCode").GetInt32());
        Assert.Equal("An internal server error occurred", doc.RootElement.GetProperty("message").GetString());
        Assert.True(doc.RootElement.TryGetProperty("timestamp", out _));
    }
}
