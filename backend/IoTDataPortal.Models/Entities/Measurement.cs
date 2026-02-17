using System.ComponentModel.DataAnnotations;

namespace IoTDataPortal.Models.Entities;

public class Measurement
{
    public Guid Id { get; set; }
    
    [Required]
    public Guid DeviceId { get; set; }
    
    public Device Device { get; set; } = null!;
    
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    
    public double Temperature { get; set; }
    
    public double Humidity { get; set; }
    
    public double EnergyUsage { get; set; }
}
