using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using IoTDataPortal.Models.Data;
using IoTDataPortal.Models.DTOs;
using IoTDataPortal.Models.Entities;
using Microsoft.Extensions.DependencyInjection;

namespace IoTDataPortal.Tests;

public class MeasurementsIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public MeasurementsIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GetMeasurements_NotOwnedDevice_ReturnsNotFound()
    {
        var deviceId = Guid.NewGuid();
        await SeedMeasurements(deviceId, "user-2", []);

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-UserId", "user-1");

        var response = await client.GetAsync($"/api/measurements?deviceId={deviceId}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetMeasurements_AppliesFromAndToFilters_AndSortsDescending()
    {
        var deviceId = Guid.NewGuid();
        var baseTime = DateTime.UtcNow.Date;

        await SeedMeasurements(deviceId, "user-1",
        [
            baseTime.AddHours(1),
            baseTime.AddHours(2),
            baseTime.AddHours(3),
            baseTime.AddHours(4),
        ]);

        var from = Uri.EscapeDataString(baseTime.AddHours(2).ToString("O"));
        var to = Uri.EscapeDataString(baseTime.AddHours(3).ToString("O"));

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-UserId", "user-1");

        var response = await client.GetAsync($"/api/measurements?deviceId={deviceId}&from={from}&to={to}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var payload = await response.Content.ReadFromJsonAsync<List<MeasurementDto>>();
        payload.Should().NotBeNull();
        payload!.Should().HaveCount(2);
        payload[0].Timestamp.Should().Be(baseTime.AddHours(3));
        payload[1].Timestamp.Should().Be(baseTime.AddHours(2));
    }

    private async Task SeedMeasurements(Guid deviceId, string ownerId, IReadOnlyCollection<DateTime> timestamps)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        context.Measurements.RemoveRange(context.Measurements);
        context.Devices.RemoveRange(context.Devices);
        await context.SaveChangesAsync();

        context.Devices.Add(new Device
        {
            Id = deviceId,
            Name = "Measure Device",
            OwnerId = ownerId,
            CreatedAt = DateTime.UtcNow,
        });

        foreach (var timestamp in timestamps)
        {
            context.Measurements.Add(new Measurement
            {
                Id = Guid.NewGuid(),
                DeviceId = deviceId,
                Timestamp = timestamp,
                Temperature = 20,
                Humidity = 40,
                EnergyUsage = 0.8,
            });
        }

        await context.SaveChangesAsync();
    }
}
