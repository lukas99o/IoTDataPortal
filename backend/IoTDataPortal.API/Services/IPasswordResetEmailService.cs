namespace IoTDataPortal.API.Services;

public interface IPasswordResetEmailService
{
    Task SendResetPasswordEmailAsync(string toEmail, string resetLink);
    Task SendEmailVerificationEmailAsync(string toEmail, string verificationLink);
}
