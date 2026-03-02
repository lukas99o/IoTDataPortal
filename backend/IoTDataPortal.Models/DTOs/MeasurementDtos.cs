namespace IoTDataPortal.Models.DTOs;

public class CreateMeasurementDto
{
    public Guid DeviceId { get; set; }
    public List<CreateMetricValueDto> Measurements { get; set; } = [];
}

public class CreateMetricValueDto
{
    public string MetricType { get; set; } = string.Empty;
    public double Value { get; set; }
    public string? Unit { get; set; }
}

public class MeasurementDto
{
    public Guid Id { get; set; }
    public Guid DeviceId { get; set; }
    public DateTime Timestamp { get; set; }
    public string MetricType { get; set; } = string.Empty;
    public double Value { get; set; }
    public string? Unit { get; set; }
}

public class MeasurementQueryDto
{
    public Guid DeviceId { get; set; }
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public string? MetricType { get; set; }
}
