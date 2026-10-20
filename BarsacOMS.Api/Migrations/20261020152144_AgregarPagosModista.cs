using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BarsacOMS.Api.Migrations
{
    /// <inheritdoc />
    public partial class AgregarPagosModista : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "pago_modista_id",
                table: "prenda_unidad",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "pago_modista",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    modista_id = table.Column<int>(type: "integer", nullable: false),
                    fecha = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    importe = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    cantidad_prendas = table.Column<int>(type: "integer", nullable: false),
                    nota = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pago_modista", x => x.id);
                    table.ForeignKey(
                        name: "FK_pago_modista_modista_modista_id",
                        column: x => x.modista_id,
                        principalTable: "modista",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_prenda_unidad_pago_modista_id",
                table: "prenda_unidad",
                column: "pago_modista_id");

            migrationBuilder.CreateIndex(
                name: "IX_pago_modista_modista_id",
                table: "pago_modista",
                column: "modista_id");

            migrationBuilder.AddForeignKey(
                name: "FK_prenda_unidad_pago_modista_pago_modista_id",
                table: "prenda_unidad",
                column: "pago_modista_id",
                principalTable: "pago_modista",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_prenda_unidad_pago_modista_pago_modista_id",
                table: "prenda_unidad");

            migrationBuilder.DropTable(
                name: "pago_modista");

            migrationBuilder.DropIndex(
                name: "IX_prenda_unidad_pago_modista_id",
                table: "prenda_unidad");

            migrationBuilder.DropColumn(
                name: "pago_modista_id",
                table: "prenda_unidad");
        }
    }
}
