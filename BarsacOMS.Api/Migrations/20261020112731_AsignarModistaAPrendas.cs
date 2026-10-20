using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BarsacOMS.Api.Migrations
{
    /// <inheritdoc />
    public partial class AsignarModistaAPrendas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "fecha_asignacion_modista",
                table: "prenda_unidad",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "modista_id",
                table: "prenda_unidad",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_prenda_unidad_modista_id",
                table: "prenda_unidad",
                column: "modista_id");

            migrationBuilder.AddForeignKey(
                name: "FK_prenda_unidad_modista_modista_id",
                table: "prenda_unidad",
                column: "modista_id",
                principalTable: "modista",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_prenda_unidad_modista_modista_id",
                table: "prenda_unidad");

            migrationBuilder.DropIndex(
                name: "IX_prenda_unidad_modista_id",
                table: "prenda_unidad");

            migrationBuilder.DropColumn(
                name: "fecha_asignacion_modista",
                table: "prenda_unidad");

            migrationBuilder.DropColumn(
                name: "modista_id",
                table: "prenda_unidad");
        }
    }
}
