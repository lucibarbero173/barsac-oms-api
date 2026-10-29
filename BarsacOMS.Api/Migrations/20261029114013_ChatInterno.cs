using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BarsacOMS.Api.Migrations
{
    /// <inheritdoc />
    public partial class ChatInterno : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "chat_lectura",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    usuario_id = table.Column<int>(type: "integer", nullable: false),
                    canal = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ultimo_mensaje_leido_id = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_chat_lectura", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "chat_mensaje",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    canal = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    usuario_id = table.Column<int>(type: "integer", nullable: false),
                    nombre_usuario = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    estacion = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    texto = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    fecha = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_chat_mensaje", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_chat_lectura_usuario_id_canal",
                table: "chat_lectura",
                columns: new[] { "usuario_id", "canal" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_chat_mensaje_canal_id",
                table: "chat_mensaje",
                columns: new[] { "canal", "id" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "chat_lectura");

            migrationBuilder.DropTable(
                name: "chat_mensaje");
        }
    }
}
