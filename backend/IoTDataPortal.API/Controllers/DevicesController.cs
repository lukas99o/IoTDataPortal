using System.Security.Claims;
using IoTDataPortal.Models.Data;
using IoTDataPortal.Models.DTOs;
using IoTDataPortal.Models.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IoTDataPortal.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DevicesController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public DevicesController(ApplicationDbContext context)
    {
        _context = context;
    }

    private string GetUserId() => User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
        ?? throw new UnauthorizedAccessException("User not authenticated");

    [HttpGet]
    public async Task<ActionResult<IEnumerable<DeviceDto>>> GetDevices()
    {
        var userId = GetUserId();
        
        var devices = await _context.Devices
            .Where(d => d.OwnerId == userId)
            .Select(d => new DeviceDto
            {
                Id = d.Id,
                Name = d.Name,
                Location = d.Location,
                CreatedAt = d.CreatedAt
            })
            .ToListAsync();

        return Ok(devices);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<DeviceDto>> GetDevice(Guid id)
    {
        var userId = GetUserId();
        
        var device = await _context.Devices
            .Where(d => d.Id == id && d.OwnerId == userId)
            .Select(d => new DeviceDto
            {
                Id = d.Id,
                Name = d.Name,
                Location = d.Location,
                CreatedAt = d.CreatedAt
            })
            .FirstOrDefaultAsync();

        if (device == null)
        {
            return NotFound(new { message = "Device not found" });
        }

        return Ok(device);
    }

    [HttpPost]
    public async Task<ActionResult<DeviceDto>> CreateDevice([FromBody] CreateDeviceDto dto)
    {
        var userId = GetUserId();

        var device = new Device
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            Location = dto.Location,
            OwnerId = userId,
            CreatedAt = DateTime.UtcNow
        };

        _context.Devices.Add(device);
        await _context.SaveChangesAsync();

        var deviceDto = new DeviceDto
        {
            Id = device.Id,
            Name = device.Name,
            Location = device.Location,
            CreatedAt = device.CreatedAt
        };

        return CreatedAtAction(nameof(GetDevice), new { id = device.Id }, deviceDto);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteDevice(Guid id)
    {
        var userId = GetUserId();
        
        var device = await _context.Devices
            .FirstOrDefaultAsync(d => d.Id == id && d.OwnerId == userId);

        if (device == null)
        {
            return NotFound(new { message = "Device not found" });
        }

        _context.Devices.Remove(device);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
