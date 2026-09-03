using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BarsacOMS.Api.Migrations
{
    /// <inheritdoc />
    public partial class AgregarConciliacionCuentas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "movimiento_manual_cuenta",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    cuenta = table.Column<string>(type: "text", nullable: false),
                    fecha = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    concepto = table.Column<string>(type: "text", nullable: false),
                    monto = table.Column<decimal>(type: "numeric", nullable: false),
                    es_ingreso = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_movimiento_manual_cuenta", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "saldo_inicial_cuenta",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    cuenta = table.Column<string>(type: "text", nullable: false),
                    fecha = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    monto = table.Column<decimal>(type: "numeric", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_saldo_inicial_cuenta", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_movimiento_manual_cuenta_cuenta",
                table: "movimiento_manual_cuenta",
                column: "cuenta");

            migrationBuilder.CreateIndex(
                name: "IX_saldo_inicial_cuenta_cuenta",
                table: "saldo_inicial_cuenta",
                column: "cuenta",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "movimiento_manual_cuenta");

            migrationBuilder.DropTable(
                name: "saldo_inicial_cuenta");
        }
    }
}
