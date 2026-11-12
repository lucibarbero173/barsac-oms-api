using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BarsacOMS.Api.Migrations
{
    /// <inheritdoc />
    public partial class TesoreriaConciliacionBanco : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "conciliacion_banco",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    cuenta = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    fecha = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    usuario_id = table.Column<int>(type: "integer", nullable: true),
                    automatica = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_conciliacion_banco", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "conciliacion_barsac",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    conciliacion_banco_id = table.Column<int>(type: "integer", nullable: false),
                    origen = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    origen_id = table.Column<int>(type: "integer", nullable: false),
                    importe = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_conciliacion_barsac", x => x.id);
                    table.ForeignKey(
                        name: "FK_conciliacion_barsac_conciliacion_banco_conciliacion_banco_id",
                        column: x => x.conciliacion_banco_id,
                        principalTable: "conciliacion_banco",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "extracto_movimiento",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    cuenta = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    fecha = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    descripcion = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    importe = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    saldo_banco = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    origen = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    fecha_carga = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    conciliacion_banco_id = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_extracto_movimiento", x => x.id);
                    table.ForeignKey(
                        name: "FK_extracto_movimiento_conciliacion_banco_conciliacion_banco_id",
                        column: x => x.conciliacion_banco_id,
                        principalTable: "conciliacion_banco",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_conciliacion_banco_cuenta",
                table: "conciliacion_banco",
                column: "cuenta");

            migrationBuilder.CreateIndex(
                name: "IX_conciliacion_barsac_conciliacion_banco_id",
                table: "conciliacion_barsac",
                column: "conciliacion_banco_id");

            migrationBuilder.CreateIndex(
                name: "IX_conciliacion_barsac_origen_origen_id",
                table: "conciliacion_barsac",
                columns: new[] { "origen", "origen_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_extracto_movimiento_conciliacion_banco_id",
                table: "extracto_movimiento",
                column: "conciliacion_banco_id");

            migrationBuilder.CreateIndex(
                name: "IX_extracto_movimiento_cuenta_fecha",
                table: "extracto_movimiento",
                columns: new[] { "cuenta", "fecha" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "conciliacion_barsac");

            migrationBuilder.DropTable(
                name: "extracto_movimiento");

            migrationBuilder.DropTable(
                name: "conciliacion_banco");
        }
    }
}
