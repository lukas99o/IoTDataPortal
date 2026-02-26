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
            Temperature = 21.5,
            Humidity = 46.2,
            EnergyUsage = 0.33,
        };

        var result = await controller.CreateMeasurement(dto);

        var createdAt = Assert.IsType<CreatedAtActionResult>(result.Result);
        Assert.Equal(nameof(MeasurementsController.GetMeasurements), createdAt.ActionName);

        var returned = Assert.IsType<MeasurementDto>(createdAt.Value);
        Assert.Equal(deviceId, returned.DeviceId);
        Assert.Equal(dto.Temperature, returned.Temperature);
        Assert.Equal(dto.Humidity, returned.Humidity);
        Assert.Equal(dto.EnergyUsage, returned.EnergyUsage);

        var saved = await context.Measurements.Where(m => m.DeviceId == deviceId).ToListAsync();
        Assert.Single(saved);

        hubClientsMock.Verify(c => c.Group(userId), Times.Once);
        hubClientsMock.Verify(c => c.Group($"device_{deviceId}"), Times.Once);
        clientProxyMock.Verify(
            proxy => proxy.SendCoreAsync(
                "ReceiveMeasurement",
                It.Is<object?[]>(args =>
                    args.Length == 1 &&
                    args[0] != null &&
                    args[0]!.GetType() == typeof(MeasurementDto) &&
                    ((MeasurementDto)args[0]!).DeviceId == deviceId),
                It.IsAny<CancellationToken>()),
            Times.Exactly(2));
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
            Temperature = 22,
            Humidity = 50,
            EnergyUsage = 0.5,
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
