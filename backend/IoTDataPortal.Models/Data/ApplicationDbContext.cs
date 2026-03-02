using IoTDataPortal.Models.Entities;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace IoTDataPortal.Models.Data;

public class ApplicationDbContext : IdentityDbContext<User>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Device> Devices { get; set; }
    public DbSet<Measurement> Measurements { get; set; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Configure User -> Device relationship
        builder.Entity<Device>()
            .HasOne(d => d.Owner)
            .WithMany(u => u.Devices)
            .HasForeignKey(d => d.OwnerId)
            .OnDelete(DeleteBehavior.Cascade);

        // Configure Device -> Measurement relationship
        builder.Entity<Measurement>()
            .HasOne(m => m.Device)
            .WithMany(d => d.Measurements)
            .HasForeignKey(m => m.DeviceId)
            .OnDelete(DeleteBehavior.Cascade);

        // Index for efficient querying
        builder.Entity<Measurement>()
            .HasIndex(m => new { m.DeviceId, m.MetricType, m.Timestamp });

        builder.Entity<Device>()
            .HasIndex(d => d.OwnerId);
    }
}
