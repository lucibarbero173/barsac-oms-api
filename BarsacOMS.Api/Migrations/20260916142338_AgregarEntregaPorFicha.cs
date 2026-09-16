using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BarsacOMS.Api.Migrations
{
    /// <inheritdoc />
    public partial class AgregarEntregaPorFicha : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "entregada",
                table: "ficha_produccion",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "fecha_entrega_ficha",
                table: "ficha_produccion",
                type: "timestamp without time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "entregada",
                table: "ficha_produccion");

            migrationBuilder.DropColumn(
                name: "fecha_entrega_ficha",
                table: "ficha_produccion");
        }
    }
}
