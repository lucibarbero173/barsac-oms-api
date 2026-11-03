using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BarsacOMS.Api.Migrations
{
    /// <inheritdoc />
    public partial class PagoModistaEnPagos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "pago_id",
                table: "pago_modista",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_pago_modista_pago_id",
                table: "pago_modista",
                column: "pago_id");

            migrationBuilder.AddForeignKey(
                name: "FK_pago_modista_Pagos_pago_id",
                table: "pago_modista",
                column: "pago_id",
                principalTable: "Pagos",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_pago_modista_Pagos_pago_id",
                table: "pago_modista");

            migrationBuilder.DropIndex(
                name: "IX_pago_modista_pago_id",
                table: "pago_modista");

            migrationBuilder.DropColumn(
                name: "pago_id",
                table: "pago_modista");
        }
    }
}
