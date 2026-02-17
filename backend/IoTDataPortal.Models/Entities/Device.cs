using System.ComponentModel.DataAnnotations;

namespace IoTDataPortal.Models.Entities;

public class Device
{
    public Guid Id { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(200)]
    public string? Location { get; set; }
    
    [Required]
    public string OwnerId { get; set; } = string.Empty;
    
    public User Owner { get; set; } = null!;
    
    public ICollection<Measurement> Measurements { get; set; } = new List<Measurement>();
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
