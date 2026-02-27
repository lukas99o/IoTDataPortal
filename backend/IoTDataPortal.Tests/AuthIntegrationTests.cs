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
    public async Task Register_NewUser_ReturnsVerificationMessage()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/register", new RegisterDto
        {
            Email = $"register-{Guid.NewGuid():N}@example.com",
            Password = "Password1",
            ConfirmPassword = "Password1",
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var payload = await response.Content.ReadFromJsonAsync<RegisterResponseDto>();
        payload.Should().NotBeNull();
        payload!.Message.ToLowerInvariant().Should().Contain("verify");
    }

    [Fact]
    public async Task Login_UnverifiedEmail_ReturnsUnauthorized()
    {
        var email = $"unverified-{Guid.NewGuid():N}@example.com";
        const string password = "Password1";

        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
            var user = new User
            {
                UserName = email,
                Email = email,
                EmailConfirmed = false,
            };

            var createUser = await userManager.CreateAsync(user, password);
            createUser.Succeeded.Should().BeTrue();
        }

        var client = _factory.CreateClient();

        var loginResponse = await client.PostAsJsonAsync("/api/auth/login", new LoginDto
        {
            Email = email,
            Password = password,
        });

        loginResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        var payload = await loginResponse.Content.ReadFromJsonAsync<Dictionary<string, string>>();
        payload.Should().NotBeNull();
        payload!["message"].ToLowerInvariant().Should().Contain("verify");
    }

    [Fact]
    public async Task ForgotPassword_NonExistingUser_ReturnsSameMessage()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/forgot-password", new ForgotPasswordDto
        {
            Email = $"missing-{Guid.NewGuid():N}@example.com",
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
                EmailConfirmed = true,
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

    [Fact]
    public async Task ResetPassword_InvalidToken_ReturnsBadRequest()
    {
        var email = $"reset-invalid-{Guid.NewGuid():N}@example.com";

        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
            var createUser = await userManager.CreateAsync(new User
            {
                UserName = email,
                Email = email,
                EmailConfirmed = true,
            }, "Password1");

            createUser.Succeeded.Should().BeTrue();
        }

        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/reset-password", new ResetPasswordDto
        {
            Email = email,
            Token = "invalid-token",
            NewPassword = "NewPassword1",
            ConfirmPassword = "NewPassword1",
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var payload = await response.Content.ReadAsStringAsync();
        payload.Should().Contain("message");
    }

    [Fact]
    public async Task VerifyEmail_ValidToken_ConfirmsEmailAndAllowsLogin()
    {
        var email = $"verify-{Guid.NewGuid():N}@example.com";
        const string password = "Password1";

        string userId;
        string token;

        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
            var user = new User
            {
                UserName = email,
                Email = email,
                EmailConfirmed = false,
            };

            var createUser = await userManager.CreateAsync(user, password);
            createUser.Succeeded.Should().BeTrue();

            userId = user.Id;
            token = await userManager.GenerateEmailConfirmationTokenAsync(user);
        }

        var client = _factory.CreateClient();

        var verifyResponse = await client.PostAsJsonAsync("/api/auth/verify-email", new VerifyEmailDto
        {
            UserId = userId,
            Token = token,
        });

        verifyResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var loginResponse = await client.PostAsJsonAsync("/api/auth/login", new LoginDto
        {
            Email = email,
            Password = password,
        });

        loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Login_InvalidModel_ReturnsBadRequest()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/login", new
        {
            Email = "",
            Password = "",
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var payload = await response.Content.ReadAsStringAsync();
        payload.Should().Contain("Email is required");
        payload.Should().Contain("Password is required");
    }

    [Fact]
    public async Task Register_InvalidModel_ReturnsBadRequest()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/register", new RegisterDto
        {
            Email = "bad-email",
            Password = "short",
            ConfirmPassword = "different",
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var payload = await response.Content.ReadAsStringAsync();
        payload.Should().Contain("Invalid email format");
        payload.Should().Contain("Password must be at least 6 characters");
        payload.Should().Contain("Passwords do not match");
    }
}
