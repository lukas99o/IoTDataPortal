using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Web;
using System.Text;
using IoTDataPortal.API.Services;
using IoTDataPortal.Models.DTOs;
using IoTDataPortal.Models.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;

namespace IoTDataPortal.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<User> _userManager;
    private readonly IConfiguration _configuration;
    private readonly IPasswordResetEmailService _passwordResetEmailService;

    public AuthController(
        UserManager<User> userManager,
        IConfiguration configuration,
        IPasswordResetEmailService passwordResetEmailService)
    {
        _userManager = userManager;
        _configuration = configuration;
        _passwordResetEmailService = passwordResetEmailService;
    }

    [HttpPost("register")]
    public async Task<ActionResult<RegisterResponseDto>> Register([FromBody] RegisterDto dto)
    {
        var existingUser = await _userManager.FindByEmailAsync(dto.Email);
        if (existingUser != null)
        {
            return BadRequest(new { message = "User with this email already exists" });
        }

        var user = new User
        {
            UserName = dto.Email,
            Email = dto.Email
        };

        var result = await _userManager.CreateAsync(user, dto.Password);

        if (!result.Succeeded)
        {
            return BadRequest(new { message = string.Join(", ", result.Errors.Select(e => e.Description)) });
        }

        var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
        var encodedToken = HttpUtility.UrlEncode(token);
        var encodedUserId = HttpUtility.UrlEncode(user.Id);
        var frontendBaseUrl = _configuration["Frontend:BaseUrl"] ?? "http://localhost:5173";
        var verificationLink = $"{frontendBaseUrl.TrimEnd('/')}/verify-email?userId={encodedUserId}&token={encodedToken}";

        await _passwordResetEmailService.SendEmailVerificationEmailAsync(user.Email!, verificationLink);

        return Ok(new RegisterResponseDto
        {
            Message = "Registration successful. Please verify your email before signing in."
        });
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);
        if (user == null)
        {
            return Unauthorized(new { message = "Invalid email or password" });
        }

        var isPasswordValid = await _userManager.CheckPasswordAsync(user, dto.Password);
        if (!isPasswordValid)
        {
            return Unauthorized(new { message = "Invalid email or password" });
        }

        if (!user.EmailConfirmed)
        {
            return Unauthorized(new { message = "Please verify your email before signing in." });
        }

        return Ok(await GenerateAuthResponse(user));
    }

    [HttpPost("verify-email")]
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailDto dto)
    {
        var user = await _userManager.FindByIdAsync(dto.UserId);

        if (user == null)
        {
            return BadRequest(new { message = "Invalid verification link" });
        }

        var result = await _userManager.ConfirmEmailAsync(user, dto.Token);
        if (!result.Succeeded)
        {
            return BadRequest(new { message = "Invalid or expired verification link" });
        }

        return Ok(new { message = "Email verified successfully. You can now sign in." });
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);

        if (user != null)
        {
            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var encodedToken = HttpUtility.UrlEncode(token);
            var encodedEmail = HttpUtility.UrlEncode(user.Email);
            var frontendBaseUrl = _configuration["Frontend:BaseUrl"] ?? "http://localhost:5173";
            var resetLink = $"{frontendBaseUrl.TrimEnd('/')}/reset-password?email={encodedEmail}&token={encodedToken}";

            await _passwordResetEmailService.SendResetPasswordEmailAsync(dto.Email, resetLink);
        }

        return Ok(new { message = "If an account with that email exists, a reset link has been sent." });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);

        if (user == null)
        {
            return BadRequest(new { message = "Invalid or expired reset link" });
        }

        var result = await _userManager.ResetPasswordAsync(user, dto.Token, dto.NewPassword);
        if (!result.Succeeded)
        {
            return BadRequest(new { message = string.Join(", ", result.Errors.Select(e => e.Description)) });
        }

        return Ok(new { message = "Password has been reset successfully" });
    }

    private async Task<AuthResponseDto> GenerateAuthResponse(User user)
    {
        var token = await GenerateJwtToken(user);
        var expiration = DateTime.UtcNow.AddHours(24);

        return new AuthResponseDto
        {
            Token = token,
            Email = user.Email!,
            Expiration = expiration
        };
    }

    private async Task<string> GenerateJwtToken(User user)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Email, user.Email!),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var roles = await _userManager.GetRolesAsync(user);
        claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Secret"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(24),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
