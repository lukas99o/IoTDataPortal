using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using IoTDataPortal.Models.Data;
using IoTDataPortal.Models.DTOs;
using IoTDataPortal.Models.Entities;
using Microsoft.Extensions.DependencyInjection;

namespace IoTDataPortal.Tests;

public class SimulatorIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public SimulatorIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GenerateMeasurements_CountOutOfRange_ReturnsBadRequest()
    {
        var deviceId = await SeedDeviceForOwner("user-1");

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-UserId", "user-1");

        var response = await client.PostAsync($"/api/simulator/generate?deviceId={deviceId}&count=0", null);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var payload = await response.Content.ReadAsStringAsync();
        payload.Should().Contain("Count must be between 1 and 100");
    }

    [Fact]
    public async Task GenerateMeasurements_NotOwnedDevice_ReturnsNotFound()
    {
        var deviceId = await SeedDeviceForOwner("user-2");

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-UserId", "user-1");

        var response = await client.PostAsync($"/api/simulator/generate?deviceId={deviceId}&count=2", null);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GenerateMeasurements_ValidRequest_PersistsAndReturnsExpectedCount()
    {
        var deviceId = await SeedDeviceForOwner("user-1");

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-UserId", "user-1");

        var response = await client.PostAsync($"/api/simulator/generate?deviceId={deviceId}&count=3", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var payload = await response.Content.ReadFromJsonAsync<List<MeasurementDto>>();
        payload.Should().NotBeNull();
        payload!.Should().HaveCount(9);

        await using var scope = _factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        context.Measurements.Count(m => m.DeviceId == deviceId).Should().Be(9);
    }

    [Fact]
    public async Task GenerateHistorical_DaysOutOfRange_ReturnsBadRequest()
    {
        var deviceId = await SeedDeviceForOwner("user-1");

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-UserId", "user-1");

        var response = await client.PostAsync($"/api/simulator/generate-historical?deviceId={deviceId}&days=31", null);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var payload = await response.Content.ReadAsStringAsync();
        payload.Should().Contain("Days must be between 1 and 30");
    }

    [Fact]
    public async Task GenerateHistorical_NotOwnedDevice_ReturnsNotFound()
    {
        var deviceId = await SeedDeviceForOwner("user-2");

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-UserId", "user-1");

        var response = await client.PostAsync($"/api/simulator/generate-historical?deviceId={deviceId}&days=2", null);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GenerateHistorical_ValidRequest_PersistsExpectedCount()
    {
        var deviceId = await SeedDeviceForOwner("user-1");

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-UserId", "user-1");

        var response = await client.PostAsync($"/api/simulator/generate-historical?deviceId={deviceId}&days=2", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var payload = await response.Content.ReadAsStringAsync();
        payload.Should().Contain("Generated 144 historical measurements");

        await using var scope = _factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        context.Measurements.Count(m => m.DeviceId == deviceId).Should().Be(144);
    }

    private async Task<Guid> SeedDeviceForOwner(string ownerId)
    {
        var deviceId = Guid.NewGuid();

        await using var scope = _factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        context.Measurements.RemoveRange(context.Measurements);
        context.Devices.RemoveRange(context.Devices);
        await context.SaveChangesAsync();

        context.Devices.Add(new Device
        {
            Id = deviceId,
            Name = "Sim Device",
            OwnerId = ownerId,
            CreatedAt = DateTime.UtcNow,
        });

        await context.SaveChangesAsync();

        return deviceId;
    }
}
