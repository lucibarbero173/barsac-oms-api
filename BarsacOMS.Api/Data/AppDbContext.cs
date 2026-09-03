using BarsacOMS.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BarsacOMS.Api.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Cliente> Clientes { get; set; }
        public DbSet<OrdenTrabajo> Ordenes { get; set; }
        public DbSet<DetallePedido> Detalles { get; set; }

        public DbSet<Producto> Productos { get; set; }
        public DbSet<PrecioProducto> PreciosProducto { get; set; }
        public DbSet<Proveedor> Proveedores { get; set; }
        public DbSet<MateriaPrima> MateriasPrimas { get; set; }
        public DbSet<Cobro> Cobros { get; set; }
        public DbSet<Pago> Pagos { get; set; }
        public DbSet<FichaProduccion> FichasProduccion { get; set; }
        public DbSet<DetalleFichaProduccion> DetallesFichaProduccion { get; set; }
        public DbSet<EntregaParcial> EntregasParciales { get; set; }
        public DbSet<Usuario> Usuarios { get; set; }
        public DbSet<PrendaUnidad> PrendasUnidad { get; set; }
        public DbSet<CostoProducto> CostosProducto { get; set; }
        public DbSet<GastoGeneral> GastosGenerales { get; set; }
        public DbSet<ConfiguracionCostos> ConfiguracionCostos { get; set; }
        public DbSet<SaldoInicialCuenta> SaldosInicialesCuenta { get; set; }
        public DbSet<MovimientoManualCuenta> MovimientosManualesCuenta { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<FichaProduccion>(entity =>
            {
                entity.ToTable("ficha_produccion");
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.OrdenId).HasColumnName("orden_id");
                entity.Property(e => e.Modista).HasColumnName("modista");

                entity.HasOne(e => e.Orden)
                      .WithMany()
                      .HasForeignKey(e => e.OrdenId)
                      .OnDelete(DeleteBehavior.Cascade);

                // Mapeo explícito de la relación con DetalleFichaProduccion
                entity.HasMany(e => e.Items)
                      .WithOne()
                      .HasForeignKey(e => e.FichaProduccionId);

                // Relación con entregas parciales
                entity.HasMany(e => e.EntregasParciales)
                      .WithOne()
                      .HasForeignKey(e => e.FichaProduccionId);
            });

            modelBuilder.Entity<DetalleFichaProduccion>(entity =>
            {
                entity.ToTable("detalle_ficha_produccion");
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.FichaProduccionId).HasColumnName("ficha_produccion_id");
                entity.Property(e => e.Producto).HasColumnName("producto");
                entity.Property(e => e.Cantidades).HasColumnName("cantidades");
                entity.Property(e => e.Talle).HasColumnName("talle");
                entity.Property(e => e.Numero).HasColumnName("numero");
                entity.Property(e => e.Nombre).HasColumnName("nombre");
                entity.Property(e => e.Detalle).HasColumnName("detalle");

                entity.Property(e => e.Archivo).HasColumnName("archivo");
                entity.Property(e => e.Impresion).HasColumnName("impresion");
                entity.Property(e => e.Calandra).HasColumnName("calandra");
                entity.Property(e => e.Corte).HasColumnName("corte");
                entity.Property(e => e.Entregado).HasColumnName("entregado");
                entity.Property(e => e.FechaEntrega).HasColumnName("fecha_entrega");

                entity.HasMany(e => e.Unidades)
                      .WithOne()
                      .HasForeignKey(u => u.DetalleFichaProduccionId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // =====================
            // PRENDA UNIDAD (control por escaneo)
            // =====================
            modelBuilder.Entity<PrendaUnidad>(entity =>
            {
                entity.ToTable("prenda_unidad");

                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.DetalleFichaProduccionId).HasColumnName("detalle_ficha_produccion_id");
                entity.Property(e => e.Controlada).HasColumnName("controlada");
                entity.Property(e => e.FechaControl).HasColumnName("fecha_control");
                entity.Property(e => e.ControladoPorUsuarioId).HasColumnName("controlado_por_usuario_id");

                entity.HasOne<Usuario>()
                      .WithMany()
                      .HasForeignKey(e => e.ControladoPorUsuarioId)
                      .OnDelete(DeleteBehavior.SetNull);
            });

            // =====================
            // ENTREGA PARCIAL (NUEVO)
            // =====================
            modelBuilder.Entity<EntregaParcial>(entity =>
            {
                entity.ToTable("EntregaParcial");

                entity.Property(e => e.Id).HasColumnName("Id");
                entity.Property(e => e.FichaProduccionId).HasColumnName("FichaProduccionId");
                entity.Property(e => e.Producto).HasColumnName("Producto");
                entity.Property(e => e.Cantidades).HasColumnName("Cantidades");
                entity.Property(e => e.Talle).HasColumnName("Talle");
                entity.Property(e => e.Numero).HasColumnName("Numero");
                entity.Property(e => e.Nombre).HasColumnName("Nombre");
                entity.Property(e => e.EstadoItem).HasColumnName("EstadoItem");
                entity.Property(e => e.FechaEntrega).HasColumnName("FechaEntrega");
            });

            // CLIENTE   
            modelBuilder.Entity<Cliente>(entity =>
            {
                entity.ToTable("cliente");

                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.Nombre).HasColumnName("nombre");
                entity.Property(e => e.Disciplina).HasColumnName("disciplina");
                entity.Property(e => e.Telefono).HasColumnName("telefono");
                entity.Property(e => e.Solicitante).HasColumnName("solicitante");
                entity.Property(e => e.ListaPrecios).HasColumnName("lista_precios");
                entity.Property(e => e.Localidad).HasColumnName("localidad");
            });

            //PAGOS
            modelBuilder.Entity<Pago>(entity =>
            {
                entity.ToTable("Pagos");
                entity.HasKey(p => p.Id);
                entity.Property(p => p.Proveedor).IsRequired().HasMaxLength(150);
                entity.Property(p => p.Concepto).IsRequired().HasMaxLength(100);
                entity.Property(p => p.MedioPago).IsRequired().HasMaxLength(50);
                entity.Property(p => p.Importe).HasPrecision(18, 2);
            });


            // ORDEN
            modelBuilder.Entity<OrdenTrabajo>(entity =>
            {
                entity.ToTable("orden_trabajo");

                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.ClienteId).HasColumnName("cliente_id");

                entity.Property(e => e.NombreCliente).HasColumnName("nombre_cliente");
                entity.Property(e => e.Telefono).HasColumnName("telefono");
                entity.Property(e => e.Solicitante).HasColumnName("solicitante");
                entity.Property(e => e.Disciplina).HasColumnName("disciplina");
                entity.Property(e => e.ListaPrecios).HasColumnName("lista_precios");

                entity.Property(e => e.FechaPedido).HasColumnName("fecha_pedido");
                entity.Property(e => e.FechaEntrega).HasColumnName("fecha_entrega");

                entity.Property(e => e.Estado).HasColumnName("estado");

                entity.Property(e => e.ImporteTotal).HasColumnName("importe_total");
                entity.Property(e => e.Senas).HasColumnName("senas");
                entity.Property(e => e.OtrosCobros).HasColumnName("otros_cobros");
                entity.Property(e => e.Saldo).HasColumnName("saldo");
                entity.Property(e => e.FormaPago).HasColumnName("forma_pago");
            });

            // =====================
            // COBRO
            // =====================
            modelBuilder.Entity<Cobro>(entity =>
            {
                entity.ToTable("cobros");

                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.OrdenId).HasColumnName("orden_id");
                entity.Property(e => e.FechaCobro).HasColumnName("fecha_cobro");
                entity.Property(e => e.ClienteId).HasColumnName("cliente_id");
                entity.Property(e => e.NombreCliente).HasColumnName("nombre_cliente");
                entity.Property(e => e.NombreOrdenante).HasColumnName("nombre_ordenante");
                entity.Property(e => e.Concepto).HasColumnName("concepto");
                entity.Property(e => e.MedioCobro).HasColumnName("medio_cobro");
                entity.Property(e => e.Importe).HasColumnName("importe");

                // Relación opcional con OrdenTrabajo
                entity.HasOne(c => c.Orden)
                      .WithMany()
                      .HasForeignKey(c => c.OrdenId)
                      .OnDelete(DeleteBehavior.SetNull);
            });

            // =====================
            // DETALLE
            // =====================
            modelBuilder.Entity<DetallePedido>(entity =>
            {
                entity.ToTable("detalle_pedido");

                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.OrdenId).HasColumnName("orden_id");

                entity.Property(e => e.ProductoId).HasColumnName("producto_id");
                entity.Property(e => e.Talle).HasColumnName("talle");
                entity.Property(e => e.Cantidad).HasColumnName("cantidad");

                entity.Property(e => e.PrecioUnitario).HasColumnName("precio_unitario");
                entity.Property(e => e.Total).HasColumnName("total");
            });

            // =====================
            // PROVEEDOR
            // =====================
            modelBuilder.Entity<Proveedor>(entity =>
            {
                entity.ToTable("proveedores");

                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.Nombre).HasColumnName("nombre");
                entity.Property(e => e.Tipo).HasColumnName("tipo");
                entity.Property(e => e.Telefono).HasColumnName("telefono");
            });

            // =====================
            // PRODUCTO
            // =====================
            modelBuilder.Entity<Producto>(entity =>
            {
                entity.ToTable("producto");

                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.Nombre).HasColumnName("nombre");
            });

            // =====================
            // MATERIA PRIMA
            // =====================
            modelBuilder.Entity<MateriaPrima>(entity =>
            {
                entity.ToTable("materias_primas");

                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.NroArticulo).HasColumnName("nro_articulo");
                entity.Property(e => e.Nombre).HasColumnName("nombre");
                entity.Property(e => e.Tipo).HasColumnName("tipo");

                entity.Property(e => e.MetrosRindePorKilo).HasColumnName("metros_rinde_por_kilo");
                entity.Property(e => e.PrecioPorKilo).HasColumnName("precio_por_kilo");

                entity.Property(e => e.Color).HasColumnName("color");
                entity.Property(e => e.PrecioPorLitro).HasColumnName("precio_por_litro");

                entity.Property(e => e.Gramaje).HasColumnName("gramaje");
                entity.Property(e => e.MetrosPorRollo).HasColumnName("metros_por_rollo");
                entity.Property(e => e.PrecioPorRollo).HasColumnName("precio_por_rollo");

                entity.Property(e => e.ProveedorId).HasColumnName("proveedor_id");
            });

            // =====================
            // USUARIOS
            // =====================
            modelBuilder.Entity<Usuario>(entity =>
            {
                entity.ToTable("usuarios");

                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.Nombre).HasColumnName("nombre");
                entity.Property(e => e.Email).HasColumnName("email");
                entity.Property(e => e.PasswordHash).HasColumnName("password_hash");
                entity.Property(e => e.Rol).HasColumnName("rol");
                entity.Property(e => e.Activo).HasColumnName("activo");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            });

            // =====================
            // COSTEADOR
            // =====================
            modelBuilder.Entity<CostoProducto>(entity =>
            {
                entity.ToTable("costo_producto");

                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.ProductoId).HasColumnName("producto_id");
                entity.Property(e => e.MateriaPrimaTelaId).HasColumnName("materia_prima_tela_id");
                entity.Property(e => e.PrendasPorKg).HasColumnName("prendas_por_kg");
                entity.Property(e => e.Scrap).HasColumnName("scrap");
                entity.Property(e => e.Flete).HasColumnName("flete");
                entity.Property(e => e.Cierre).HasColumnName("cierre");
                entity.Property(e => e.ElasticoCapucha).HasColumnName("elastico_capucha");
                entity.Property(e => e.Impresion).HasColumnName("impresion");
                entity.Property(e => e.Confeccion).HasColumnName("confeccion");
                entity.Property(e => e.RemarquePorcentaje).HasColumnName("remarque_porcentaje");

                entity.HasIndex(e => e.ProductoId).IsUnique();

                entity.HasOne(e => e.Producto)
                      .WithMany()
                      .HasForeignKey(e => e.ProductoId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.MateriaPrimaTela)
                      .WithMany()
                      .HasForeignKey(e => e.MateriaPrimaTelaId)
                      .OnDelete(DeleteBehavior.SetNull);
            });

            modelBuilder.Entity<GastoGeneral>(entity =>
            {
                entity.ToTable("gasto_general");

                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.Nombre).HasColumnName("nombre");
                entity.Property(e => e.MontoMensual).HasColumnName("monto_mensual");
                entity.Property(e => e.Tipo).HasColumnName("tipo");
            });

            modelBuilder.Entity<ConfiguracionCostos>(entity =>
            {
                entity.ToTable("configuracion_costos");

                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.ProduccionMensualEstimada).HasColumnName("produccion_mensual_estimada");
            });

            // =====================
            // CONCILIACIÓN DE CUENTAS
            // =====================
            modelBuilder.Entity<SaldoInicialCuenta>(entity =>
            {
                entity.ToTable("saldo_inicial_cuenta");

                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.Cuenta).HasColumnName("cuenta");
                entity.Property(e => e.Fecha).HasColumnName("fecha");
                entity.Property(e => e.Monto).HasColumnName("monto");

                entity.HasIndex(e => e.Cuenta).IsUnique();
            });

            modelBuilder.Entity<MovimientoManualCuenta>(entity =>
            {
                entity.ToTable("movimiento_manual_cuenta");

                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.Cuenta).HasColumnName("cuenta");
                entity.Property(e => e.Fecha).HasColumnName("fecha");
                entity.Property(e => e.Concepto).HasColumnName("concepto");
                entity.Property(e => e.Monto).HasColumnName("monto");
                entity.Property(e => e.EsIngreso).HasColumnName("es_ingreso");

                entity.HasIndex(e => e.Cuenta);
            });

            // =====================
            // PRECIO PRODUCTO
            // =====================
            modelBuilder.Entity<PrecioProducto>(entity =>
            {
                entity.ToTable("precio_producto");

                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.ProductoId).HasColumnName("producto_id");

                entity.Property(e => e.Talle).HasColumnName("talle");
                entity.Property(e => e.TipoPago).HasColumnName("tipo_pago");
                entity.Property(e => e.Precio).HasColumnName("precio");
            });
        }
    }
}