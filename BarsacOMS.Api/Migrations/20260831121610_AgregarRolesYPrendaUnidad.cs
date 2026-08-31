using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BarsacOMS.Api.Migrations
{
    /// <inheritdoc />
    public partial class AgregarRolesYPrendaUnidad : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "detalle",
                table: "detalle_ficha_produccion",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "prenda_unidad",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    detalle_ficha_produccion_id = table.Column<int>(type: "integer", nullable: false),
                    controlada = table.Column<bool>(type: "boolean", nullable: false),
                    fecha_control = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    controlado_por_usuario_id = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_prenda_unidad", x => x.id);
                    table.ForeignKey(
                        name: "FK_prenda_unidad_detalle_ficha_produccion_detalle_ficha_produc~",
                        column: x => x.detalle_ficha_produccion_id,
                        principalTable: "detalle_ficha_produccion",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_prenda_unidad_usuarios_controlado_por_usuario_id",
                        column: x => x.controlado_por_usuario_id,
                        principalTable: "usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_prenda_unidad_controlado_por_usuario_id",
                table: "prenda_unidad",
                column: "controlado_por_usuario_id");

            migrationBuilder.CreateIndex(
                name: "IX_prenda_unidad_detalle_ficha_produccion_id",
                table: "prenda_unidad",
                column: "detalle_ficha_produccion_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "prenda_unidad");

            migrationBuilder.DropColumn(
                name: "detalle",
                table: "detalle_ficha_produccion");
        }
    }
}
