using FluentValidation;
using IoTDataPortal.Models.DTOs;

namespace IoTDataPortal.API.Validators;

public class CreateDeviceDtoValidator : AbstractValidator<CreateDeviceDto>
{
    public CreateDeviceDtoValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Device name is required")
            .MaximumLength(100).WithMessage("Device name cannot exceed 100 characters");

        RuleFor(x => x.Location)
            .MaximumLength(200).WithMessage("Location cannot exceed 200 characters");
    }
}
