using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using IoTDataPortal.Models.Data;
using IoTDataPortal.Models.DTOs;
using IoTDataPortal.Models.Entities;
using Microsoft.Extensions.DependencyInjection;

namespace IoTDataPortal.Tests;

public class DevicesIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public DevicesIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GetDevices_ReturnsOnlyDevicesForAuthenticatedUser()
    {
        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            context.Measurements.RemoveRange(context.Measurements);
            context.Devices.RemoveRange(context.Devices);
            await context.SaveChangesAsync();

            context.Devices.AddRange(
                new Device
                {
                    Id = Guid.NewGuid(),
                    Name = "My Device",
                    OwnerId = "user-1",
                    CreatedAt = DateTime.UtcNow,
                },
                new Device
                {
                    Id = Guid.NewGuid(),
                    Name = "Other User Device",
                    OwnerId = "user-2",
                    CreatedAt = DateTime.UtcNow,
                });

            await context.SaveChangesAsync();
        }

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-UserId", "user-1");
        client.DefaultRequestHeaders.Add("X-Test-Email", "user1@example.com");

        var response = await client.GetAsync("/api/devices");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var devices = await response.Content.ReadFromJsonAsync<List<DeviceDto>>();
        devices.Should().NotBeNull();
        devices!.Should().HaveCount(1);
        devices[0].Name.Should().Be("My Device");
    }

    [Fact]
    public async Task GetDevice_OwnedByUser_ReturnsDevice()
    {
        var deviceId = Guid.NewGuid();

        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            context.Measurements.RemoveRange(context.Measurements);
            context.Devices.RemoveRange(context.Devices);
            await context.SaveChangesAsync();

            context.Devices.Add(new Device
            {
                Id = deviceId,
                Name = "Office Sensor",
                OwnerId = "user-1",
                CreatedAt = DateTime.UtcNow,
            });
            await context.SaveChangesAsync();
        }

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-UserId", "user-1");

        var response = await client.GetAsync($"/api/devices/{deviceId}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var device = await response.Content.ReadFromJsonAsync<DeviceDto>();
        device.Should().NotBeNull();
        device!.Id.Should().Be(deviceId);
        device.Name.Should().Be("Office Sensor");
    }

    [Fact]
    public async Task GetDevice_NotOwnedByUser_ReturnsNotFound()
    {
        var deviceId = Guid.NewGuid();

        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            context.Measurements.RemoveRange(context.Measurements);
            context.Devices.RemoveRange(context.Devices);
            await context.SaveChangesAsync();

            context.Devices.Add(new Device
            {
                Id = deviceId,
                Name = "Private Sensor",
                OwnerId = "user-2",
                CreatedAt = DateTime.UtcNow,
            });
            await context.SaveChangesAsync();
        }

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-UserId", "user-1");

        var response = await client.GetAsync($"/api/devices/{deviceId}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task CreateDevice_InvalidPayload_ReturnsBadRequest()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-UserId", "user-1");

        var response = await client.PostAsJsonAsync("/api/devices", new CreateDeviceDto
        {
            Name = "",
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var payload = await response.Content.ReadAsStringAsync();
        payload.Should().Contain("Device name is required");
    }

    [Fact]
    public async Task DeleteDevice_OwnedByUser_DeletesDevice()
    {
        var deviceId = Guid.NewGuid();

        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            context.Measurements.RemoveRange(context.Measurements);
            context.Devices.RemoveRange(context.Devices);
            await context.SaveChangesAsync();

            context.Devices.Add(new Device
            {
                Id = deviceId,
                Name = "Delete Me",
                OwnerId = "user-1",
                CreatedAt = DateTime.UtcNow,
                Measurements = new List<Measurement>
                {
                    new()
                    {
                        Id = Guid.NewGuid(),
                        DeviceId = deviceId,
                        Timestamp = DateTime.UtcNow,
                        Temperature = 20,
                        Humidity = 40,
                        EnergyUsage = 1.1,
                    }
                }
            });
            await context.SaveChangesAsync();
        }

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-UserId", "user-1");

        var response = await client.DeleteAsync($"/api/devices/{deviceId}");

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        await using (var verificationScope = _factory.Services.CreateAsyncScope())
        {
            var context = verificationScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            context.Devices.Any(d => d.Id == deviceId).Should().BeFalse();
        }
    }

    [Fact]
    public async Task DeleteDevice_NotOwnedByUser_ReturnsNotFound()
    {
        var deviceId = Guid.NewGuid();

        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            context.Measurements.RemoveRange(context.Measurements);
            context.Devices.RemoveRange(context.Devices);
            await context.SaveChangesAsync();

            context.Devices.Add(new Device
            {
                Id = deviceId,
                Name = "Other Device",
                OwnerId = "user-2",
                CreatedAt = DateTime.UtcNow,
            });
            await context.SaveChangesAsync();
        }

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-UserId", "user-1");

        var response = await client.DeleteAsync($"/api/devices/{deviceId}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
