using System.Net;
using System.Net.Mail;

namespace IoTDataPortal.API.Services;

public class PasswordResetEmailService : IPasswordResetEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<PasswordResetEmailService> _logger;

    public PasswordResetEmailService(IConfiguration configuration, ILogger<PasswordResetEmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendResetPasswordEmailAsync(string toEmail, string resetLink)
    {
        var host = _configuration["Smtp:Host"];
        var fromEmail = _configuration["Smtp:FromEmail"];

        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(fromEmail))
        {
            _logger.LogWarning(
                "SMTP not configured. Password reset email for {Email} was not sent. Reset link: {ResetLink}",
                toEmail,
                resetLink);
            return;
        }

        var port = int.TryParse(_configuration["Smtp:Port"], out var configuredPort)
            ? configuredPort
            : 587;
        var enableSsl = bool.TryParse(_configuration["Smtp:EnableSsl"], out var configuredEnableSsl)
            ? configuredEnableSsl
            : true;
        var username = _configuration["Smtp:Username"];
        var password = _configuration["Smtp:Password"];

        using var client = new SmtpClient(host, port)
        {
            EnableSsl = enableSsl
        };

        if (!string.IsNullOrWhiteSpace(username) && !string.IsNullOrWhiteSpace(password))
        {
            client.Credentials = new NetworkCredential(username, password);
        }

        using var message = new MailMessage
        {
            From = new MailAddress(fromEmail),
            Subject = "Reset your IoT Data Portal password",
            Body = $"Use this link to reset your password: {resetLink}",
            IsBodyHtml = false
        };

        message.To.Add(toEmail);

        await client.SendMailAsync(message);
    }
}
