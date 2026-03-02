using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IoTDataPortal.Models.Migrations
{
    /// <inheritdoc />
    public partial class GenericMeasurements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Measurements_DeviceId_Timestamp",
                table: "Measurements");

            migrationBuilder.DropColumn(
                name: "EnergyUsage",
                table: "Measurements");

            migrationBuilder.DropColumn(
                name: "Humidity",
                table: "Measurements");

            migrationBuilder.RenameColumn(
                name: "Temperature",
                table: "Measurements",
                newName: "Value");

            migrationBuilder.AddColumn<string>(
                name: "MetricType",
                table: "Measurements",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Unit",
                table: "Measurements",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Measurements_DeviceId_MetricType_Timestamp",
                table: "Measurements",
                columns: new[] { "DeviceId", "MetricType", "Timestamp" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Measurements_DeviceId_MetricType_Timestamp",
                table: "Measurements");

            migrationBuilder.DropColumn(
                name: "MetricType",
                table: "Measurements");

            migrationBuilder.DropColumn(
                name: "Unit",
                table: "Measurements");

            migrationBuilder.RenameColumn(
                name: "Value",
                table: "Measurements",
                newName: "Temperature");

            migrationBuilder.AddColumn<double>(
                name: "EnergyUsage",
                table: "Measurements",
                type: "float",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "Humidity",
                table: "Measurements",
                type: "float",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.CreateIndex(
                name: "IX_Measurements_DeviceId_Timestamp",
                table: "Measurements",
                columns: new[] { "DeviceId", "Timestamp" });
        }
    }
}
