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

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

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
                      .OnDelete(DeleteBehavior.SetNull); // Si borras la orden, el cobro no se borra, solo queda orden_id en NULL
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

                // Le decimos a EF que en la BD es un string (VARCHAR), pero en C# usa el Enum
                entity.Property(e => e.Tipo)
                      .HasColumnName("tipo")
                      .HasConversion<string>();

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

                // Campos específicos de TELAS
                entity.Property(e => e.MetrosRindePorKilo).HasColumnName("metros_rinde_por_kilo");
                entity.Property(e => e.PrecioPorKilo).HasColumnName("precio_por_kilo");

                // Campos específicos de TINTAS
                entity.Property(e => e.Color).HasColumnName("color");
                entity.Property(e => e.PrecioPorLitro).HasColumnName("precio_por_litro");

                // Campos específicos de PAPEL
                entity.Property(e => e.Gramaje).HasColumnName("gramaje");
                entity.Property(e => e.MetrosPorRollo).HasColumnName("metros_por_rollo");
                entity.Property(e => e.PrecioPorRollo).HasColumnName("precio_por_rollo");

                // Relación con Proveedores
                entity.Property(e => e.ProveedorId).HasColumnName("proveedor_id");
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