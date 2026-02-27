using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using IoTDataPortal.Models.DTOs;
using IoTDataPortal.Models.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace IoTDataPortal.Tests;

public class AuthIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public AuthIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task ForgotPassword_ExistingUser_ReturnsOk()
    {
        var email = $"forgot-{Guid.NewGuid():N}@example.com";

        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
            var createUser = await userManager.CreateAsync(new User
            {
                UserName = email,
                Email = email,
            }, "OldPassword1");

            createUser.Succeeded.Should().BeTrue();
        }

        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/forgot-password", new ForgotPasswordDto
        {
            Email = email,
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var payload = await response.Content.ReadFromJsonAsync<Dictionary<string, string>>();
        payload.Should().NotBeNull();
        payload!["message"].Should().Be("If an account with that email exists, a reset link has been sent.");
    }

    [Fact]
    public async Task ResetPassword_ValidToken_UpdatesPasswordAndAllowsLogin()
    {
        var email = $"reset-{Guid.NewGuid():N}@example.com";
        const string oldPassword = "OldPassword1";
        const string newPassword = "NewPassword1";

        string token;

        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
            var user = new User
            {
                UserName = email,
                Email = email,
            };

            var createUser = await userManager.CreateAsync(user, oldPassword);
            createUser.Succeeded.Should().BeTrue();

            token = await userManager.GeneratePasswordResetTokenAsync(user);
        }

        var client = _factory.CreateClient();

        var resetResponse = await client.PostAsJsonAsync("/api/auth/reset-password", new ResetPasswordDto
        {
            Email = email,
            Token = token,
            NewPassword = newPassword,
            ConfirmPassword = newPassword,
        });

        resetResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var resetPayload = await resetResponse.Content.ReadFromJsonAsync<Dictionary<string, string>>();
        resetPayload.Should().NotBeNull();
        resetPayload!["message"].Should().Be("Password has been reset successfully");

        var loginResponse = await client.PostAsJsonAsync("/api/auth/login", new LoginDto
        {
            Email = email,
            Password = newPassword,
        });

        loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var authPayload = await loginResponse.Content.ReadFromJsonAsync<AuthResponseDto>();
        authPayload.Should().NotBeNull();
        authPayload!.Email.Should().Be(email);
        authPayload.Token.Should().NotBeNullOrWhiteSpace();
    }
}
