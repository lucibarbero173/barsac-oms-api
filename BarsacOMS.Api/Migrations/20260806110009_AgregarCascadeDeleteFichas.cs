using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BarsacOMS.Api.Migrations
{
    /// <inheritdoc />
    public partial class AgregarCascadeDeleteFichas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "localidad",
                table: "cliente",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "ficha_produccion",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    orden_id = table.Column<int>(type: "integer", nullable: false),
                    modista = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ficha_produccion", x => x.id);
                    table.ForeignKey(
                        name: "FK_ficha_produccion_orden_trabajo_orden_id",
                        column: x => x.orden_id,
                        principalTable: "orden_trabajo",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "usuarios",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    nombre = table.Column<string>(type: "text", nullable: false),
                    email = table.Column<string>(type: "text", nullable: false),
                    password_hash = table.Column<string>(type: "text", nullable: false),
                    rol = table.Column<string>(type: "text", nullable: false),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_usuarios", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "detalle_ficha_produccion",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ficha_produccion_id = table.Column<int>(type: "integer", nullable: false),
                    producto = table.Column<string>(type: "text", nullable: false),
                    cantidades = table.Column<int>(type: "integer", nullable: false),
                    talle = table.Column<string>(type: "text", nullable: false),
                    numero = table.Column<int>(type: "integer", nullable: true),
                    nombre = table.Column<string>(type: "text", nullable: true),
                    archivo = table.Column<bool>(type: "boolean", nullable: false),
                    impresion = table.Column<bool>(type: "boolean", nullable: false),
                    calandra = table.Column<bool>(type: "boolean", nullable: false),
                    corte = table.Column<bool>(type: "boolean", nullable: false),
                    entregado = table.Column<bool>(type: "boolean", nullable: false),
                    fecha_entrega = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_detalle_ficha_produccion", x => x.id);
                    table.ForeignKey(
                        name: "FK_detalle_ficha_produccion_ficha_produccion_ficha_produccion_~",
                        column: x => x.ficha_produccion_id,
                        principalTable: "ficha_produccion",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "EntregaParcial",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FichaProduccionId = table.Column<int>(type: "integer", nullable: false),
                    Producto = table.Column<string>(type: "text", nullable: false),
                    Cantidades = table.Column<int>(type: "integer", nullable: false),
                    Talle = table.Column<string>(type: "text", nullable: false),
                    Numero = table.Column<int>(type: "integer", nullable: true),
                    Nombre = table.Column<string>(type: "text", nullable: true),
                    EstadoItem = table.Column<string>(type: "text", nullable: false),
                    FechaEntrega = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EntregaParcial", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EntregaParcial_ficha_produccion_FichaProduccionId",
                        column: x => x.FichaProduccionId,
                        principalTable: "ficha_produccion",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_detalle_ficha_produccion_ficha_produccion_id",
                table: "detalle_ficha_produccion",
                column: "ficha_produccion_id");

            migrationBuilder.CreateIndex(
                name: "IX_EntregaParcial_FichaProduccionId",
                table: "EntregaParcial",
                column: "FichaProduccionId");

            migrationBuilder.CreateIndex(
                name: "IX_ficha_produccion_orden_id",
                table: "ficha_produccion",
                column: "orden_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "detalle_ficha_produccion");

            migrationBuilder.DropTable(
                name: "EntregaParcial");

            migrationBuilder.DropTable(
                name: "usuarios");

            migrationBuilder.DropTable(
                name: "ficha_produccion");

            migrationBuilder.DropColumn(
                name: "localidad",
                table: "cliente");
        }
    }
}
