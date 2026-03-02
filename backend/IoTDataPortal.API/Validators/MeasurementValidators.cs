using FluentValidation;
using IoTDataPortal.Models.DTOs;

namespace IoTDataPortal.API.Validators;

public class CreateMeasurementDtoValidator : AbstractValidator<CreateMeasurementDto>
{
    public CreateMeasurementDtoValidator()
    {
        RuleFor(x => x.DeviceId)
            .NotEmpty().WithMessage("Device ID is required");

        RuleFor(x => x.Measurements)
            .NotEmpty().WithMessage("At least one measurement is required");

        RuleForEach(x => x.Measurements)
            .SetValidator(new CreateMetricValueDtoValidator());
    }
}

public class CreateMetricValueDtoValidator : AbstractValidator<CreateMetricValueDto>
{
    public CreateMetricValueDtoValidator()
    {
        RuleFor(x => x.MetricType)
            .NotEmpty().WithMessage("Metric type is required")
            .MaximumLength(100).WithMessage("Metric type cannot exceed 100 characters");

        RuleFor(x => x.Value)
            .Must(value => !double.IsNaN(value) && !double.IsInfinity(value))
            .WithMessage("Measurement value must be a valid number");

        RuleFor(x => x.Unit)
            .MaximumLength(20).WithMessage("Unit cannot exceed 20 characters")
            .When(x => !string.IsNullOrWhiteSpace(x.Unit));
    }
}
