namespace IoTDataPortal.API.Services;

public interface IPasswordResetEmailService
{
    Task SendResetPasswordEmailAsync(string toEmail, string resetLink);
    Task<bool> SendEmailVerificationEmailAsync(string toEmail, string verificationLink);
}
