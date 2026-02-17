using Microsoft.AspNetCore.Identity;

namespace IoTDataPortal.Models.Entities;

public class User : IdentityUser
{
    public ICollection<Device> Devices { get; set; } = new List<Device>();
}
