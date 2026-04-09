using System.Security.Claims;
using System.Security.Cryptography;
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

    private static string GenerateApiKey() =>
        Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();

    private static DeviceDto ToDto(Device d) => new()
    {
        Id = d.Id,
        Name = d.Name,
        Location = d.Location,
        CreatedAt = d.CreatedAt,
        ApiKey = d.ApiKey
    };

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
                CreatedAt = d.CreatedAt,
                ApiKey = d.ApiKey
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
            .FirstOrDefaultAsync();

        if (device == null)
        {
            return NotFound(new { message = "Device not found" });
        }

        return Ok(ToDto(device));
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
            CreatedAt = DateTime.UtcNow,
            ApiKey = GenerateApiKey()
        };

        _context.Devices.Add(device);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetDevice), new { id = device.Id }, ToDto(device));
    }

    [HttpPost("{id}/regenerate-api-key")]
    public async Task<ActionResult<DeviceDto>> RegenerateApiKey(Guid id)
    {
        var userId = GetUserId();

        var device = await _context.Devices
            .FirstOrDefaultAsync(d => d.Id == id && d.OwnerId == userId);

        if (device == null)
        {
            return NotFound(new { message = "Device not found" });
        }

        device.ApiKey = GenerateApiKey();
        await _context.SaveChangesAsync();

        return Ok(ToDto(device));
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
