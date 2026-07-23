using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BarsacOMS.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "cliente",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    nombre = table.Column<string>(type: "text", nullable: false),
                    disciplina = table.Column<string>(type: "text", nullable: false),
                    telefono = table.Column<string>(type: "text", nullable: false),
                    solicitante = table.Column<string>(type: "text", nullable: false),
                    lista_precios = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cliente", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "Pagos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FechaFactura = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    Proveedor = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Concepto = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    MedioPago = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Importe = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Estado = table.Column<int>(type: "integer", nullable: false),
                    FechaPago = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Pagos", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "producto",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    nombre = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_producto", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "proveedores",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    nombre = table.Column<string>(type: "text", nullable: false),
                    tipo = table.Column<string>(type: "text", nullable: false),
                    telefono = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_proveedores", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "orden_trabajo",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    cliente_id = table.Column<int>(type: "integer", nullable: false),
                    nombre_cliente = table.Column<string>(type: "text", nullable: false),
                    telefono = table.Column<string>(type: "text", nullable: false),
                    solicitante = table.Column<string>(type: "text", nullable: false),
                    disciplina = table.Column<string>(type: "text", nullable: false),
                    lista_precios = table.Column<string>(type: "text", nullable: false),
                    fecha_pedido = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    fecha_entrega = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    estado = table.Column<int>(type: "integer", nullable: false),
                    forma_pago = table.Column<string>(type: "text", nullable: false),
                    importe_total = table.Column<decimal>(type: "numeric", nullable: false),
                    senas = table.Column<decimal>(type: "numeric", nullable: true),
                    otros_cobros = table.Column<decimal>(type: "numeric", nullable: true),
                    saldo = table.Column<decimal>(type: "numeric", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_orden_trabajo", x => x.id);
                    table.ForeignKey(
                        name: "FK_orden_trabajo_cliente_cliente_id",
                        column: x => x.cliente_id,
                        principalTable: "cliente",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "precio_producto",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    producto_id = table.Column<int>(type: "integer", nullable: false),
                    talle = table.Column<string>(type: "text", nullable: false),
                    tipo_pago = table.Column<string>(type: "text", nullable: false),
                    precio = table.Column<decimal>(type: "numeric", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_precio_producto", x => x.id);
                    table.ForeignKey(
                        name: "FK_precio_producto_producto_producto_id",
                        column: x => x.producto_id,
                        principalTable: "producto",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "materias_primas",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    nro_articulo = table.Column<string>(type: "text", nullable: false),
                    nombre = table.Column<string>(type: "text", nullable: false),
                    tipo = table.Column<string>(type: "text", nullable: false),
                    metros_rinde_por_kilo = table.Column<decimal>(type: "numeric", nullable: true),
                    precio_por_kilo = table.Column<decimal>(type: "numeric", nullable: true),
                    color = table.Column<string>(type: "text", nullable: true),
                    precio_por_litro = table.Column<decimal>(type: "numeric", nullable: true),
                    gramaje = table.Column<int>(type: "integer", nullable: true),
                    metros_por_rollo = table.Column<decimal>(type: "numeric", nullable: true),
                    precio_por_rollo = table.Column<decimal>(type: "numeric", nullable: true),
                    proveedor_id = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_materias_primas", x => x.id);
                    table.ForeignKey(
                        name: "FK_materias_primas_proveedores_proveedor_id",
                        column: x => x.proveedor_id,
                        principalTable: "proveedores",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "cobros",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    orden_id = table.Column<int>(type: "integer", nullable: true),
                    fecha_cobro = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    cliente_id = table.Column<int>(type: "integer", nullable: true),
                    nombre_cliente = table.Column<string>(type: "text", nullable: true),
                    nombre_ordenante = table.Column<string>(type: "text", nullable: true),
                    concepto = table.Column<string>(type: "text", nullable: false),
                    medio_cobro = table.Column<string>(type: "text", nullable: false),
                    importe = table.Column<decimal>(type: "numeric", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cobros", x => x.id);
                    table.ForeignKey(
                        name: "FK_cobros_orden_trabajo_orden_id",
                        column: x => x.orden_id,
                        principalTable: "orden_trabajo",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "detalle_pedido",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    orden_id = table.Column<int>(type: "integer", nullable: false),
                    producto_id = table.Column<int>(type: "integer", nullable: false),
                    talle = table.Column<string>(type: "text", nullable: false),
                    cantidad = table.Column<int>(type: "integer", nullable: false),
                    precio_unitario = table.Column<decimal>(type: "numeric", nullable: false),
                    total = table.Column<decimal>(type: "numeric", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_detalle_pedido", x => x.id);
                    table.ForeignKey(
                        name: "FK_detalle_pedido_orden_trabajo_orden_id",
                        column: x => x.orden_id,
                        principalTable: "orden_trabajo",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_detalle_pedido_producto_producto_id",
                        column: x => x.producto_id,
                        principalTable: "producto",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_cobros_orden_id",
                table: "cobros",
                column: "orden_id");

            migrationBuilder.CreateIndex(
                name: "IX_detalle_pedido_orden_id",
                table: "detalle_pedido",
                column: "orden_id");

            migrationBuilder.CreateIndex(
                name: "IX_detalle_pedido_producto_id",
                table: "detalle_pedido",
                column: "producto_id");

            migrationBuilder.CreateIndex(
                name: "IX_materias_primas_proveedor_id",
                table: "materias_primas",
                column: "proveedor_id");

            migrationBuilder.CreateIndex(
                name: "IX_orden_trabajo_cliente_id",
                table: "orden_trabajo",
                column: "cliente_id");

            migrationBuilder.CreateIndex(
                name: "IX_precio_producto_producto_id",
                table: "precio_producto",
                column: "producto_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "cobros");

            migrationBuilder.DropTable(
                name: "detalle_pedido");

            migrationBuilder.DropTable(
                name: "materias_primas");

            migrationBuilder.DropTable(
                name: "Pagos");

            migrationBuilder.DropTable(
                name: "precio_producto");

            migrationBuilder.DropTable(
                name: "orden_trabajo");

            migrationBuilder.DropTable(
                name: "proveedores");

            migrationBuilder.DropTable(
                name: "producto");

            migrationBuilder.DropTable(
                name: "cliente");
        }
    }
}
