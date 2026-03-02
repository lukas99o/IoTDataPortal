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
        [FromQuery] DateTime? to,
        [FromQuery] string? metricType)
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

        if (!string.IsNullOrWhiteSpace(metricType))
        {
            query = query.Where(m => m.MetricType == metricType);
        }

        var measurements = await query
            .OrderByDescending(m => m.Timestamp)
            .Select(m => new MeasurementDto
            {
                Id = m.Id,
                DeviceId = m.DeviceId,
                Timestamp = m.Timestamp,
                MetricType = m.MetricType,
                Value = m.Value,
                Unit = m.Unit
            })
            .ToListAsync();

        return Ok(measurements);
    }

    [HttpPost]
    public async Task<ActionResult<IEnumerable<MeasurementDto>>> CreateMeasurement([FromBody] CreateMeasurementDto dto)
    {
        var userId = GetUserId();

        // Verify device belongs to user
        var device = await _context.Devices
            .FirstOrDefaultAsync(d => d.Id == dto.DeviceId && d.OwnerId == userId);

        if (device == null)
        {
            return NotFound(new { message = "Device not found" });
        }

        var timestamp = DateTime.UtcNow;
        var measurements = dto.Measurements.Select(m => new Measurement
        {
            Id = Guid.NewGuid(),
            DeviceId = dto.DeviceId,
            Timestamp = timestamp,
            MetricType = m.MetricType.Trim(),
            Value = m.Value,
            Unit = string.IsNullOrWhiteSpace(m.Unit) ? null : m.Unit.Trim()
        }).ToList();

        _context.Measurements.AddRange(measurements);
        await _context.SaveChangesAsync();

        var measurementDtos = measurements.Select(m => new MeasurementDto
        {
            Id = m.Id,
            DeviceId = m.DeviceId,
            Timestamp = m.Timestamp,
            MetricType = m.MetricType,
            Value = m.Value,
            Unit = m.Unit
        }).ToList();

        foreach (var measurementDto in measurementDtos)
        {
            await _hubContext.Clients.Group(userId).SendAsync("ReceiveMeasurement", measurementDto);
            await _hubContext.Clients.Group($"device_{dto.DeviceId}").SendAsync("ReceiveMeasurement", measurementDto);
        }

        return CreatedAtAction(nameof(GetMeasurements), new { deviceId = dto.DeviceId }, measurementDtos);
    }
}
