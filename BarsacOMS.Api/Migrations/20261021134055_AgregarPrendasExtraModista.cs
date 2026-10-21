using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BarsacOMS.Api.Migrations
{
    /// <inheritdoc />
    public partial class AgregarPrendasExtraModista : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "prenda_extra_modista",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    modista_id = table.Column<int>(type: "integer", nullable: false),
                    ficha_produccion_id = table.Column<int>(type: "integer", nullable: false),
                    producto = table.Column<string>(type: "text", nullable: false),
                    cantidad = table.Column<int>(type: "integer", nullable: false),
                    nota = table.Column<string>(type: "text", nullable: true),
                    fecha_carga = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    estado = table.Column<int>(type: "integer", nullable: false),
                    fecha_revision = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    precio_unitario = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    pago_modista_id = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_prenda_extra_modista", x => x.id);
                    table.ForeignKey(
                        name: "FK_prenda_extra_modista_ficha_produccion_ficha_produccion_id",
                        column: x => x.ficha_produccion_id,
                        principalTable: "ficha_produccion",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_prenda_extra_modista_modista_modista_id",
                        column: x => x.modista_id,
                        principalTable: "modista",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_prenda_extra_modista_pago_modista_pago_modista_id",
                        column: x => x.pago_modista_id,
                        principalTable: "pago_modista",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_prenda_extra_modista_ficha_produccion_id",
                table: "prenda_extra_modista",
                column: "ficha_produccion_id");

            migrationBuilder.CreateIndex(
                name: "IX_prenda_extra_modista_modista_id",
                table: "prenda_extra_modista",
                column: "modista_id");

            migrationBuilder.CreateIndex(
                name: "IX_prenda_extra_modista_pago_modista_id",
                table: "prenda_extra_modista",
                column: "pago_modista_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "prenda_extra_modista");
        }
    }
}
