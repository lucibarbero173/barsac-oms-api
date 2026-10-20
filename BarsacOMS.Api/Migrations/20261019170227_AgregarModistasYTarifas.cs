using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BarsacOMS.Api.Migrations
{
    /// <inheritdoc />
    public partial class AgregarModistasYTarifas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "modista",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    nombre = table.Column<string>(type: "text", nullable: false),
                    usuario_id = table.Column<int>(type: "integer", nullable: true),
                    activa = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_modista", x => x.id);
                    table.ForeignKey(
                        name: "FK_modista_usuarios_usuario_id",
                        column: x => x.usuario_id,
                        principalTable: "usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "tarifa_modista",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    modista_id = table.Column<int>(type: "integer", nullable: false),
                    producto_id = table.Column<int>(type: "integer", nullable: false),
                    precio = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tarifa_modista", x => x.id);
                    table.ForeignKey(
                        name: "FK_tarifa_modista_modista_modista_id",
                        column: x => x.modista_id,
                        principalTable: "modista",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_tarifa_modista_producto_producto_id",
                        column: x => x.producto_id,
                        principalTable: "producto",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_modista_usuario_id",
                table: "modista",
                column: "usuario_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tarifa_modista_modista_id_producto_id",
                table: "tarifa_modista",
                columns: new[] { "modista_id", "producto_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tarifa_modista_producto_id",
                table: "tarifa_modista",
                column: "producto_id");

            // Las modistas que ya estaban fijas en la lista de fichaProduccion.html.
            migrationBuilder.Sql(
                "INSERT INTO modista (nombre, activa) VALUES " +
                "('Ale', true), ('Tere', true), ('Vero', true), ('Loli', true), " +
                "('Beti', true), ('Sarita', true), ('Vicki', true);");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tarifa_modista");

            migrationBuilder.DropTable(
                name: "modista");
        }
    }
}
