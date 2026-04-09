using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IoTDataPortal.Models.Migrations
{
    /// <inheritdoc />
    public partial class AddApiKeyToDevice : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ApiKey",
                table: "Devices",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "");

            // Back-fill unique keys for any devices that already existed
            migrationBuilder.Sql(
                "UPDATE [Devices] SET [ApiKey] = LOWER(REPLACE(CONVERT(nvarchar(36), NEWID()), '-', '') + REPLACE(CONVERT(nvarchar(36), NEWID()), '-', '')) WHERE [ApiKey] = ''");

            migrationBuilder.CreateIndex(
                name: "IX_Devices_ApiKey",
                table: "Devices",
                column: "ApiKey",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Devices_ApiKey",
                table: "Devices");

            migrationBuilder.DropColumn(
                name: "ApiKey",
                table: "Devices");
        }
    }
}
