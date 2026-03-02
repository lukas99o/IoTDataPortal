using System.ComponentModel.DataAnnotations;

namespace IoTDataPortal.Models.Entities;

public class Measurement
{
    public Guid Id { get; set; }
    
    [Required]
    public Guid DeviceId { get; set; }
    
    public Device Device { get; set; } = null!;
    
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    [Required]
    [MaxLength(100)]
    public string MetricType { get; set; } = string.Empty;

    public double Value { get; set; }

    [MaxLength(20)]
    public string? Unit { get; set; }
}
