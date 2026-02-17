using FluentValidation;
using IoTDataPortal.Models.DTOs;

namespace IoTDataPortal.API.Validators;

public class CreateMeasurementDtoValidator : AbstractValidator<CreateMeasurementDto>
{
    public CreateMeasurementDtoValidator()
    {
        RuleFor(x => x.DeviceId)
            .NotEmpty().WithMessage("Device ID is required");

        RuleFor(x => x.Temperature)
            .InclusiveBetween(-50, 100).WithMessage("Temperature must be between -50 and 100°C");

        RuleFor(x => x.Humidity)
            .InclusiveBetween(0, 100).WithMessage("Humidity must be between 0 and 100%");

        RuleFor(x => x.EnergyUsage)
            .GreaterThanOrEqualTo(0).WithMessage("Energy usage cannot be negative");
    }
}
