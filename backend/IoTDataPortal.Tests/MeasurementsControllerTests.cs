using System.Security.Claims;
using IoTDataPortal.API.Controllers;
using IoTDataPortal.API.Hubs;
using IoTDataPortal.Models.Data;
using IoTDataPortal.Models.DTOs;
using IoTDataPortal.Models.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace IoTDataPortal.Tests;

public class MeasurementsControllerTests
{
    [Fact]
    public async Task CreateMeasurement_ValidDevice_CreatesMeasurement_AndBroadcastsToGroups()
    {
        var userId = "user-123";
        var deviceId = Guid.NewGuid();

        await using var context = CreateInMemoryContext();
        context.Devices.Add(new Device
        {
            Id = deviceId,
            Name = "Kitchen Sensor",
            OwnerId = userId,
            CreatedAt = DateTime.UtcNow,
        });
        await context.SaveChangesAsync();

        var hubClientsMock = new Mock<IHubClients>();
        var clientProxyMock = new Mock<IClientProxy>();
        hubClientsMock.Setup(clients => clients.Group(It.IsAny<string>())).Returns(clientProxyMock.Object);

        var hubContextMock = new Mock<IHubContext<MeasurementHub>>();
        hubContextMock.SetupGet(h => h.Clients).Returns(hubClientsMock.Object);

        var controller = new MeasurementsController(context, hubContextMock.Object);
        SetAuthenticatedUser(controller, userId);

        var dto = new CreateMeasurementDto
        {
            DeviceId = deviceId,
            Measurements =
            [
                new CreateMetricValueDto
                {
                    MetricType = "temperature",
                    Value = 21.5,
                    Unit = "°C",
                },
                new CreateMetricValueDto
                {
                    MetricType = "humidity",
                    Value = 46.2,
                    Unit = "%",
                },
                new CreateMetricValueDto
                {
                    MetricType = "energy_usage",
                    Value = 0.33,
                    Unit = "kWh",
                },
            ],
        };

        var result = await controller.CreateMeasurement(dto);

        var createdAt = Assert.IsType<CreatedAtActionResult>(result.Result);
        Assert.Equal(nameof(MeasurementsController.GetMeasurements), createdAt.ActionName);

        var returned = Assert.IsType<List<MeasurementDto>>(createdAt.Value);
        Assert.Equal(3, returned.Count);
        Assert.All(returned, m => Assert.Equal(deviceId, m.DeviceId));
        Assert.Contains(returned, m => m is { MetricType: "temperature", Value: 21.5, Unit: "°C" });
        Assert.Contains(returned, m => m is { MetricType: "humidity", Value: 46.2, Unit: "%" });
        Assert.Contains(returned, m => m is { MetricType: "energy_usage", Value: 0.33, Unit: "kWh" });

        var saved = await context.Measurements.Where(m => m.DeviceId == deviceId).ToListAsync();
        Assert.Equal(3, saved.Count);

        hubClientsMock.Verify(c => c.Group(userId), Times.Exactly(3));
        hubClientsMock.Verify(c => c.Group($"device_{deviceId}"), Times.Exactly(3));
        clientProxyMock.Verify(
            proxy => proxy.SendCoreAsync(
                "ReceiveMeasurement",
                It.Is<object?[]>(args =>
                    args.Length == 1 &&
                    args[0] != null &&
                    args[0]!.GetType() == typeof(MeasurementDto) &&
                    ((MeasurementDto)args[0]!).DeviceId == deviceId),
                It.IsAny<CancellationToken>()),
            Times.Exactly(6));
    }

    [Fact]
    public async Task CreateMeasurement_DeviceNotOwnedByUser_ReturnsNotFound_AndDoesNotBroadcast()
    {
        var userId = "user-123";

        await using var context = CreateInMemoryContext();

        var hubClientsMock = new Mock<IHubClients>();
        var clientProxyMock = new Mock<IClientProxy>();
        hubClientsMock.Setup(clients => clients.Group(It.IsAny<string>())).Returns(clientProxyMock.Object);

        var hubContextMock = new Mock<IHubContext<MeasurementHub>>();
        hubContextMock.SetupGet(h => h.Clients).Returns(hubClientsMock.Object);

        var controller = new MeasurementsController(context, hubContextMock.Object);
        SetAuthenticatedUser(controller, userId);

        var dto = new CreateMeasurementDto
        {
            DeviceId = Guid.NewGuid(),
            Measurements =
            [
                new CreateMetricValueDto
                {
                    MetricType = "temperature",
                    Value = 22,
                    Unit = "°C",
                },
            ],
        };

        var result = await controller.CreateMeasurement(dto);

        var notFound = Assert.IsType<NotFoundObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status404NotFound, notFound.StatusCode);

        var saved = await context.Measurements.ToListAsync();
        Assert.Empty(saved);

        hubClientsMock.Verify(c => c.Group(It.IsAny<string>()), Times.Never);
        clientProxyMock.Verify(
            proxy => proxy.SendCoreAsync(
                It.IsAny<string>(),
                It.IsAny<object?[]>(),
                It.IsAny<CancellationToken>()),
            Times.Never);
    }

    private static ApplicationDbContext CreateInMemoryContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options);
    }

    private static void SetAuthenticatedUser(ControllerBase controller, string userId)
    {
        var claims = new[] { new Claim(ClaimTypes.NameIdentifier, userId) };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = principal,
            },
        };
    }
}
