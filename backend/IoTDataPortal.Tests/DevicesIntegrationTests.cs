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
}
