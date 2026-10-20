using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BarsacOMS.Api.Migrations
{
    /// <inheritdoc />
    public partial class MarcarPrendasCosidas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "cosida",
                table: "prenda_unidad",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "fecha_cosida",
                table: "prenda_unidad",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "precio_cosido",
                table: "prenda_unidad",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "cosida",
                table: "prenda_unidad");

            migrationBuilder.DropColumn(
                name: "fecha_cosida",
                table: "prenda_unidad");

            migrationBuilder.DropColumn(
                name: "precio_cosido",
                table: "prenda_unidad");
        }
    }
}
