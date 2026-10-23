using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BarsacOMS.Api.Migrations
{
    /// <inheritdoc />
    public partial class AgregarEtapaImpresion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "fecha_impresion",
                table: "ficha_produccion",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "impreso_por_usuario_id",
                table: "ficha_produccion",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ruta_impresion",
                table: "ficha_produccion",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "fecha_impresion",
                table: "ficha_produccion");

            migrationBuilder.DropColumn(
                name: "impreso_por_usuario_id",
                table: "ficha_produccion");

            migrationBuilder.DropColumn(
                name: "ruta_impresion",
                table: "ficha_produccion");
        }
    }
}
