using System.Text;
using System.Text.Json;

namespace IoTDataPortal.API.Services;

public class PasswordResetEmailService : IPasswordResetEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<PasswordResetEmailService> _logger;
    private readonly HttpClient _httpClient;

    public PasswordResetEmailService(
        IConfiguration configuration,
        ILogger<PasswordResetEmailService> logger,
        HttpClient httpClient)
    {
        _configuration = configuration;
        _logger = logger;
        _httpClient = httpClient;

        var appsettingsApiKey = _configuration["Brevo:ApiKey"];
        var environmentApiKey = Environment.GetEnvironmentVariable("BrevoApiKey");

        if (appsettingsApiKey == null && environmentApiKey == null)
            throw new InvalidOperationException("Brevo API key is not configured");

        _httpClient.BaseAddress = new Uri("https://api.brevo.com/");

        if (!string.IsNullOrWhiteSpace(appsettingsApiKey))
            _httpClient.DefaultRequestHeaders.Add("api-key", appsettingsApiKey);
        else if (!string.IsNullOrWhiteSpace(environmentApiKey))
            _httpClient.DefaultRequestHeaders.Add("api-key", environmentApiKey);
        else 
            throw new InvalidOperationException("Brevo API key is not configured");        
    }

    public async Task SendResetPasswordEmailAsync(string toEmail, string resetLink)
    {
        var fromEmail = _configuration["Brevo:FromEmail"];
        var fromName = _configuration["Brevo:FromName"] ?? "IoT Data Portal";

        if (string.IsNullOrWhiteSpace(fromEmail))
        {
            _logger.LogWarning(
                "Brevo not configured. Password reset email for {Email} was not sent. Reset link: {ResetLink}",
                toEmail,
                resetLink);
            return;
        }

        var payload = new
        {
            sender = new { email = fromEmail, name = fromName },
            to = new[] { new { email = toEmail } },
            subject = "Reset your IoT Data Portal password",
            htmlContent = $"""
                <p>You requested a password reset for your IoT Data Portal account.</p>
                <p><a href="{resetLink}">Click here to reset your password</a></p>
                <p>If the button does not work, copy and paste this URL into your browser:</p>
                <p>{resetLink}</p>
                """
        };

        await SendAsync(payload);
    }

    public async Task<bool> SendEmailVerificationEmailAsync(string toEmail, string verificationLink)
    {
        var fromEmail = _configuration["Brevo:FromEmail"];
        var fromName = _configuration["Brevo:FromName"] ?? "IoT Data Portal";

        if (string.IsNullOrWhiteSpace(fromEmail))
        {
            _logger.LogWarning(
                "Brevo not configured. Verification email for {Email} was not sent. Verification link: {VerificationLink}",
                toEmail,
                verificationLink);
            return false;
        }

        var payload = new
        {
            sender = new { email = fromEmail, name = fromName },
            to = new[] { new { email = toEmail } },
            subject = "Verify your IoT Data Portal email",
            htmlContent = $"""
                <p>Welcome to IoT Data Portal.</p>
                <p><a href="{verificationLink}">Click here to verify your email address</a></p>
                <p>If the button does not work, copy and paste this URL into your browser:</p>
                <p>{verificationLink}</p>
                """
        };

        await SendAsync(payload);
        return true;
    }

    private async Task SendAsync(object payload)
    {
        var json = JsonSerializer.Serialize(payload);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await _httpClient.PostAsync("v3/smtp/email", content);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();
            _logger.LogError(
                "Brevo API returned {StatusCode}: {Body}",
                response.StatusCode,
                body);

            response.EnsureSuccessStatusCode();
        }
    }
}