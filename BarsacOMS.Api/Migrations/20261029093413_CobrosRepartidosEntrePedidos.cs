using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BarsacOMS.Api.Migrations
{
    /// <inheritdoc />
    public partial class CobrosRepartidosEntrePedidos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "cobro_asignacion",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    cobro_id = table.Column<int>(type: "integer", nullable: false),
                    orden_id = table.Column<int>(type: "integer", nullable: false),
                    importe = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cobro_asignacion", x => x.id);
                    table.ForeignKey(
                        name: "FK_cobro_asignacion_cobros_cobro_id",
                        column: x => x.cobro_id,
                        principalTable: "cobros",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_cobro_asignacion_orden_trabajo_orden_id",
                        column: x => x.orden_id,
                        principalTable: "orden_trabajo",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_cobro_asignacion_cobro_id",
                table: "cobro_asignacion",
                column: "cobro_id");

            migrationBuilder.CreateIndex(
                name: "IX_cobro_asignacion_orden_id",
                table: "cobro_asignacion",
                column: "orden_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "cobro_asignacion");
        }
    }
}
