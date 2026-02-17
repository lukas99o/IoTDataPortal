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
public class SimulatorController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IHubContext<MeasurementHub> _hubContext;
    private static readonly Random _random = new();

    public SimulatorController(ApplicationDbContext context, IHubContext<MeasurementHub> hubContext)
    {
        _context = context;
        _hubContext = hubContext;
    }

    private string GetUserId() => User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
        ?? throw new UnauthorizedAccessException("User not authenticated");

    [HttpPost("generate")]
    public async Task<ActionResult<IEnumerable<MeasurementDto>>> GenerateMeasurements(
        [FromQuery] Guid deviceId,
        [FromQuery] int count = 1)
    {
        var userId = GetUserId();

        // Verify device belongs to user
        var device = await _context.Devices
            .FirstOrDefaultAsync(d => d.Id == deviceId && d.OwnerId == userId);

        if (device == null)
        {
            return NotFound(new { message = "Device not found" });
        }

        if (count < 1 || count > 100)
        {
            return BadRequest(new { message = "Count must be between 1 and 100" });
        }

        var measurements = new List<MeasurementDto>();

        for (int i = 0; i < count; i++)
        {
            var measurement = new Measurement
            {
                Id = Guid.NewGuid(),
                DeviceId = deviceId,
                Timestamp = DateTime.UtcNow.AddSeconds(-i), // Slightly staggered timestamps
                Temperature = Math.Round(18.0 + _random.NextDouble() * 10.0, 1), // 18-28°C
                Humidity = Math.Round(30.0 + _random.NextDouble() * 40.0, 1), // 30-70%
                EnergyUsage = Math.Round(0.5 + _random.NextDouble() * 2.5, 2) // 0.5-3.0 kWh
            };

            _context.Measurements.Add(measurement);

            var measurementDto = new MeasurementDto
            {
                Id = measurement.Id,
                DeviceId = measurement.DeviceId,
                Timestamp = measurement.Timestamp,
                Temperature = measurement.Temperature,
                Humidity = measurement.Humidity,
                EnergyUsage = measurement.EnergyUsage
            };

            measurements.Add(measurementDto);

            // Broadcast each measurement via SignalR
            await _hubContext.Clients.Group(userId).SendAsync("ReceiveMeasurement", measurementDto);
            await _hubContext.Clients.Group($"device_{deviceId}").SendAsync("ReceiveMeasurement", measurementDto);
        }

        await _context.SaveChangesAsync();

        return Ok(measurements);
    }

    [HttpPost("generate-historical")]
    public async Task<ActionResult> GenerateHistoricalData(
        [FromQuery] Guid deviceId,
        [FromQuery] int days = 7)
    {
        var userId = GetUserId();

        // Verify device belongs to user
        var device = await _context.Devices
            .FirstOrDefaultAsync(d => d.Id == deviceId && d.OwnerId == userId);

        if (device == null)
        {
            return NotFound(new { message = "Device not found" });
        }

        if (days < 1 || days > 30)
        {
            return BadRequest(new { message = "Days must be between 1 and 30" });
        }

        var startDate = DateTime.UtcNow.AddDays(-days);
        var measurementsPerDay = 24; // One per hour
        var totalMeasurements = days * measurementsPerDay;

        for (int i = 0; i < totalMeasurements; i++)
        {
            var measurement = new Measurement
            {
                Id = Guid.NewGuid(),
                DeviceId = deviceId,
                Timestamp = startDate.AddHours(i),
                Temperature = Math.Round(18.0 + _random.NextDouble() * 10.0, 1),
                Humidity = Math.Round(30.0 + _random.NextDouble() * 40.0, 1),
                EnergyUsage = Math.Round(0.5 + _random.NextDouble() * 2.5, 2)
            };

            _context.Measurements.Add(measurement);
        }

        await _context.SaveChangesAsync();

        return Ok(new { message = $"Generated {totalMeasurements} historical measurements for the past {days} days" });
    }
}
