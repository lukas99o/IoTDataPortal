namespace IoTDataPortal.Models.DTOs;

public class CreateDeviceDto
{
    public string Name { get; set; } = string.Empty;
    public string? Location { get; set; }
}

public class DeviceDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Location { get; set; }
    public DateTime CreatedAt { get; set; }
}
