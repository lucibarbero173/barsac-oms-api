using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BarsacOMS.Api.Migrations
{
    /// <inheritdoc />
    public partial class AgregarEtapasDisenoYCorte : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "cortado_por_usuario_id",
                table: "prenda_unidad",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "corte_detalle_faltante",
                table: "prenda_unidad",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "corte_estado",
                table: "prenda_unidad",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "diseno_listo",
                table: "prenda_unidad",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "diseno_por_usuario_id",
                table: "prenda_unidad",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "fecha_corte",
                table: "prenda_unidad",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "fecha_diseno",
                table: "prenda_unidad",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "imagen_diseno_base64",
                table: "ficha_produccion",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_prenda_unidad_cortado_por_usuario_id",
                table: "prenda_unidad",
                column: "cortado_por_usuario_id");

            migrationBuilder.CreateIndex(
                name: "IX_prenda_unidad_diseno_por_usuario_id",
                table: "prenda_unidad",
                column: "diseno_por_usuario_id");

            migrationBuilder.AddForeignKey(
                name: "FK_prenda_unidad_usuarios_cortado_por_usuario_id",
                table: "prenda_unidad",
                column: "cortado_por_usuario_id",
                principalTable: "usuarios",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_prenda_unidad_usuarios_diseno_por_usuario_id",
                table: "prenda_unidad",
                column: "diseno_por_usuario_id",
                principalTable: "usuarios",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_prenda_unidad_usuarios_cortado_por_usuario_id",
                table: "prenda_unidad");

            migrationBuilder.DropForeignKey(
                name: "FK_prenda_unidad_usuarios_diseno_por_usuario_id",
                table: "prenda_unidad");

            migrationBuilder.DropIndex(
                name: "IX_prenda_unidad_cortado_por_usuario_id",
                table: "prenda_unidad");

            migrationBuilder.DropIndex(
                name: "IX_prenda_unidad_diseno_por_usuario_id",
                table: "prenda_unidad");

            migrationBuilder.DropColumn(
                name: "cortado_por_usuario_id",
                table: "prenda_unidad");

            migrationBuilder.DropColumn(
                name: "corte_detalle_faltante",
                table: "prenda_unidad");

            migrationBuilder.DropColumn(
                name: "corte_estado",
                table: "prenda_unidad");

            migrationBuilder.DropColumn(
                name: "diseno_listo",
                table: "prenda_unidad");

            migrationBuilder.DropColumn(
                name: "diseno_por_usuario_id",
                table: "prenda_unidad");

            migrationBuilder.DropColumn(
                name: "fecha_corte",
                table: "prenda_unidad");

            migrationBuilder.DropColumn(
                name: "fecha_diseno",
                table: "prenda_unidad");

            migrationBuilder.DropColumn(
                name: "imagen_diseno_base64",
                table: "ficha_produccion");
        }
    }
}
