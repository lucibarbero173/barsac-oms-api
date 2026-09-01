using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BarsacOMS.Api.Migrations
{
    /// <inheritdoc />
    public partial class AgregarCosteador : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "configuracion_costos",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    produccion_mensual_estimada = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_configuracion_costos", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "costo_producto",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    producto_id = table.Column<int>(type: "integer", nullable: false),
                    materia_prima_tela_id = table.Column<int>(type: "integer", nullable: true),
                    prendas_por_kg = table.Column<decimal>(type: "numeric", nullable: false),
                    scrap = table.Column<decimal>(type: "numeric", nullable: false),
                    flete = table.Column<decimal>(type: "numeric", nullable: false),
                    cierre = table.Column<decimal>(type: "numeric", nullable: false),
                    elastico_capucha = table.Column<decimal>(type: "numeric", nullable: false),
                    impresion = table.Column<decimal>(type: "numeric", nullable: false),
                    confeccion = table.Column<decimal>(type: "numeric", nullable: false),
                    remarque_porcentaje = table.Column<decimal>(type: "numeric", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_costo_producto", x => x.id);
                    table.ForeignKey(
                        name: "FK_costo_producto_materias_primas_materia_prima_tela_id",
                        column: x => x.materia_prima_tela_id,
                        principalTable: "materias_primas",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_costo_producto_producto_producto_id",
                        column: x => x.producto_id,
                        principalTable: "producto",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "gasto_general",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    nombre = table.Column<string>(type: "text", nullable: false),
                    monto_mensual = table.Column<decimal>(type: "numeric", nullable: false),
                    tipo = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_gasto_general", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_costo_producto_materia_prima_tela_id",
                table: "costo_producto",
                column: "materia_prima_tela_id");

            migrationBuilder.CreateIndex(
                name: "IX_costo_producto_producto_id",
                table: "costo_producto",
                column: "producto_id",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "configuracion_costos");

            migrationBuilder.DropTable(
                name: "costo_producto");

            migrationBuilder.DropTable(
                name: "gasto_general");
        }
    }
}
