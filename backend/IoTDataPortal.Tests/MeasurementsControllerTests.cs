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
            Times.Exactly(3));
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

public class IngestMeasurementsTests
{
    private const string ValidApiKey = "abc123def456abc123def456abc12345";

    [Fact]
    public async Task IngestMeasurements_ValidApiKey_CreatesMeasurements_AndReturns201()
    {
        var deviceId = Guid.NewGuid();
        await using var context = CreateInMemoryContext();
        context.Devices.Add(new Device { Id = deviceId, Name = "Sensor", OwnerId = "u1", ApiKey = ValidApiKey, CreatedAt = DateTime.UtcNow });
        await context.SaveChangesAsync();

        var (_, _, hubContext) = CreateHubMocks();
        var controller = new MeasurementsController(context, hubContext.Object);

        var dto = new IngestMeasurementsDto
        {
            Measurements =
            [
                new CreateMetricValueDto { MetricType = "cpu_load", Value = 42.5, Unit = "%" },
                new CreateMetricValueDto { MetricType = "ram_used", Value = 67.1, Unit = "%" },
            ],
        };

        var result = await controller.IngestMeasurements(ValidApiKey, dto);

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        Assert.Equal(StatusCodes.Status201Created, created.StatusCode);

        var returned = Assert.IsType<List<MeasurementDto>>(created.Value);
        Assert.Equal(2, returned.Count);
        Assert.All(returned, m => Assert.Equal(deviceId, m.DeviceId));
        Assert.Contains(returned, m => m is { MetricType: "cpu_load", Value: 42.5, Unit: "%" });
        Assert.Contains(returned, m => m is { MetricType: "ram_used", Value: 67.1, Unit: "%" });

        var saved = await context.Measurements.Where(m => m.DeviceId == deviceId).ToListAsync();
        Assert.Equal(2, saved.Count);
    }

    [Fact]
    public async Task IngestMeasurements_ValidApiKey_BroadcastsEachMeasurementToDeviceGroup()
    {
        var deviceId = Guid.NewGuid();
        await using var context = CreateInMemoryContext();
        context.Devices.Add(new Device { Id = deviceId, Name = "Sensor", OwnerId = "u1", ApiKey = ValidApiKey, CreatedAt = DateTime.UtcNow });
        await context.SaveChangesAsync();

        var (hubClients, clientProxy, hubContext) = CreateHubMocks();
        var controller = new MeasurementsController(context, hubContext.Object);

        var dto = new IngestMeasurementsDto
        {
            Measurements =
            [
                new CreateMetricValueDto { MetricType = "temperature", Value = 55.0, Unit = "°C" },
                new CreateMetricValueDto { MetricType = "humidity",    Value = 40.0, Unit = "%" },
            ],
        };

        await controller.IngestMeasurements(ValidApiKey, dto);

        hubClients.Verify(c => c.Group($"device_{deviceId}"), Times.Exactly(2));
        clientProxy.Verify(
            p => p.SendCoreAsync(
                "ReceiveMeasurement",
                It.Is<object?[]>(args => args.Length == 1 && args[0] != null && args[0]!.GetType() == typeof(MeasurementDto) && ((MeasurementDto)args[0]!).DeviceId == deviceId),
                It.IsAny<CancellationToken>()),
            Times.Exactly(2));
    }

    [Fact]
    public async Task IngestMeasurements_MissingApiKey_ReturnsUnauthorized()
    {
        await using var context = CreateInMemoryContext();
        var (_, _, hubContext) = CreateHubMocks();
        var controller = new MeasurementsController(context, hubContext.Object);

        var result = await controller.IngestMeasurements(null, new IngestMeasurementsDto
        {
            Measurements = [new CreateMetricValueDto { MetricType = "cpu_load", Value = 1 }],
        });

        var unauthorized = Assert.IsType<UnauthorizedObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status401Unauthorized, unauthorized.StatusCode);
    }

    [Fact]
    public async Task IngestMeasurements_WhitespaceApiKey_ReturnsUnauthorized()
    {
        await using var context = CreateInMemoryContext();
        var (_, _, hubContext) = CreateHubMocks();
        var controller = new MeasurementsController(context, hubContext.Object);

        var result = await controller.IngestMeasurements("   ", new IngestMeasurementsDto
        {
            Measurements = [new CreateMetricValueDto { MetricType = "cpu_load", Value = 1 }],
        });

        Assert.IsType<UnauthorizedObjectResult>(result.Result);
    }

    [Fact]
    public async Task IngestMeasurements_InvalidApiKey_ReturnsUnauthorized()
    {
        await using var context = CreateInMemoryContext();
        context.Devices.Add(new Device { Id = Guid.NewGuid(), Name = "Sensor", OwnerId = "u1", ApiKey = ValidApiKey, CreatedAt = DateTime.UtcNow });
        await context.SaveChangesAsync();

        var (_, _, hubContext) = CreateHubMocks();
        var controller = new MeasurementsController(context, hubContext.Object);

        var result = await controller.IngestMeasurements("wrong-key-000", new IngestMeasurementsDto
        {
            Measurements = [new CreateMetricValueDto { MetricType = "cpu_load", Value = 1 }],
        });

        Assert.IsType<UnauthorizedObjectResult>(result.Result);
        Assert.Empty(await context.Measurements.ToListAsync());
    }

    [Fact]
    public async Task IngestMeasurements_TrimsMetricTypeAndUnit()
    {
        var deviceId = Guid.NewGuid();
        await using var context = CreateInMemoryContext();
        context.Devices.Add(new Device { Id = deviceId, Name = "Sensor", OwnerId = "u1", ApiKey = ValidApiKey, CreatedAt = DateTime.UtcNow });
        await context.SaveChangesAsync();

        var (_, _, hubContext) = CreateHubMocks();
        var controller = new MeasurementsController(context, hubContext.Object);

        var dto = new IngestMeasurementsDto
        {
            Measurements = [new CreateMetricValueDto { MetricType = "  cpu_load  ", Value = 10.0, Unit = " % " }],
        };

        await controller.IngestMeasurements(ValidApiKey, dto);

        var saved = await context.Measurements.FirstAsync();
        Assert.Equal("cpu_load", saved.MetricType);
        Assert.Equal("%", saved.Unit);
    }

    [Fact]
    public async Task IngestMeasurements_NullUnit_StoredAsNull()
    {
        var deviceId = Guid.NewGuid();
        await using var context = CreateInMemoryContext();
        context.Devices.Add(new Device { Id = deviceId, Name = "Sensor", OwnerId = "u1", ApiKey = ValidApiKey, CreatedAt = DateTime.UtcNow });
        await context.SaveChangesAsync();

        var (_, _, hubContext) = CreateHubMocks();
        var controller = new MeasurementsController(context, hubContext.Object);

        var dto = new IngestMeasurementsDto
        {
            Measurements = [new CreateMetricValueDto { MetricType = "on_off", Value = 1.0, Unit = null }],
        };

        await controller.IngestMeasurements(ValidApiKey, dto);

        var saved = await context.Measurements.FirstAsync();
        Assert.Null(saved.Unit);
    }

    [Fact]
    public async Task IngestMeasurements_InvalidApiKey_DoesNotBroadcast()
    {
        await using var context = CreateInMemoryContext();
        var (hubClients, clientProxy, hubContext) = CreateHubMocks();
        var controller = new MeasurementsController(context, hubContext.Object);

        await controller.IngestMeasurements("no-such-key", new IngestMeasurementsDto
        {
            Measurements = [new CreateMetricValueDto { MetricType = "cpu_load", Value = 1 }],
        });

        hubClients.Verify(c => c.Group(It.IsAny<string>()), Times.Never);
        clientProxy.Verify(p => p.SendCoreAsync(It.IsAny<string>(), It.IsAny<object?[]>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    private static ApplicationDbContext CreateInMemoryContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new ApplicationDbContext(options);
    }

    private static (Mock<IHubClients> clients, Mock<IClientProxy> proxy, Mock<IHubContext<MeasurementHub>> context) CreateHubMocks()
    {
        var clients = new Mock<IHubClients>();
        var proxy = new Mock<IClientProxy>();
        clients.Setup(c => c.Group(It.IsAny<string>())).Returns(proxy.Object);
        var hubContext = new Mock<IHubContext<MeasurementHub>>();
        hubContext.SetupGet(h => h.Clients).Returns(clients.Object);
        return (clients, proxy, hubContext);
    }
}