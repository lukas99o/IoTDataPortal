using System.Security.Claims;
using IoTDataPortal.API.Hubs;
using IoTDataPortal.Models.Data;
using IoTDataPortal.Models.DTOs;
using IoTDataPortal.Models.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace IoTDataPortal.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MeasurementsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IHubContext<MeasurementHub> _hubContext;

    public MeasurementsController(ApplicationDbContext context, IHubContext<MeasurementHub> hubContext)
    {
        _context = context;
        _hubContext = hubContext;
    }

    private string GetUserId() => User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
        ?? throw new UnauthorizedAccessException("User not authenticated");

    [HttpGet]
    public async Task<ActionResult<IEnumerable<MeasurementDto>>> GetMeasurements(
        [FromQuery] Guid deviceId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        var userId = GetUserId();

        // Verify device belongs to user
        var deviceExists = await _context.Devices
            .AnyAsync(d => d.Id == deviceId && d.OwnerId == userId);

        if (!deviceExists)
        {
            return NotFound(new { message = "Device not found" });
        }

        var query = _context.Measurements
            .Where(m => m.DeviceId == deviceId);

        if (from.HasValue)
        {
            query = query.Where(m => m.Timestamp >= from.Value);
        }

        if (to.HasValue)
        {
            query = query.Where(m => m.Timestamp <= to.Value);
        }

        var measurements = await query
            .OrderByDescending(m => m.Timestamp)
            .Select(m => new MeasurementDto
            {
                Id = m.Id,
                DeviceId = m.DeviceId,
                Timestamp = m.Timestamp,
                Temperature = m.Temperature,
                Humidity = m.Humidity,
                EnergyUsage = m.EnergyUsage
            })
            .ToListAsync();

        return Ok(measurements);
    }

    [HttpPost]
    public async Task<ActionResult<MeasurementDto>> CreateMeasurement([FromBody] CreateMeasurementDto dto)
    {
        var userId = GetUserId();

        // Verify device belongs to user
        var device = await _context.Devices
            .FirstOrDefaultAsync(d => d.Id == dto.DeviceId && d.OwnerId == userId);

        if (device == null)
        {
            return NotFound(new { message = "Device not found" });
        }

        var measurement = new Measurement
        {
            Id = Guid.NewGuid(),
            DeviceId = dto.DeviceId,
            Timestamp = DateTime.UtcNow,
            Temperature = dto.Temperature,
            Humidity = dto.Humidity,
            EnergyUsage = dto.EnergyUsage
        };

        _context.Measurements.Add(measurement);
        await _context.SaveChangesAsync();

        var measurementDto = new MeasurementDto
        {
            Id = measurement.Id,
            DeviceId = measurement.DeviceId,
            Timestamp = measurement.Timestamp,
            Temperature = measurement.Temperature,
            Humidity = measurement.Humidity,
            EnergyUsage = measurement.EnergyUsage
        };

        // Broadcast to SignalR clients
        await _hubContext.Clients.Group(userId).SendAsync("ReceiveMeasurement", measurementDto);
        await _hubContext.Clients.Group($"device_{dto.DeviceId}").SendAsync("ReceiveMeasurement", measurementDto);

        return CreatedAtAction(nameof(GetMeasurements), new { deviceId = measurement.DeviceId }, measurementDto);
    }
}
