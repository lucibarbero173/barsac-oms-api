namespace BarsacOMS.Api.Data
{
    using BarsacOMS.Api.Models;
    using Microsoft.EntityFrameworkCore;

    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Cliente> Clientes { get; set; }
        public DbSet<OrdenTrabajo> Ordenes { get; set; }
        public DbSet<DetallePedido> Detalles { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

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

            modelBuilder.Entity<OrdenTrabajo>(entity =>
            {
                entity.ToTable("orden_trabajo");

                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.ClienteId).HasColumnName("cliente_id");
                entity.Property(e => e.FechaPedido).HasColumnName("fecha_pedido");
                entity.Property(e => e.FechaEntrega).HasColumnName("fecha_entrega");
                entity.Property(e => e.Estado).HasColumnName("estado");
            });

            modelBuilder.Entity<DetallePedido>(entity =>
            {
                entity.ToTable("detalle_pedido");

                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.OrdenId).HasColumnName("orden_id");
                entity.Property(e => e.Tela).HasColumnName("tela");
                entity.Property(e => e.Producto).HasColumnName("producto");
                entity.Property(e => e.Talle).HasColumnName("talle");
                entity.Property(e => e.Numero).HasColumnName("numero");
                entity.Property(e => e.Nombre).HasColumnName("nombre");
                entity.Property(e => e.Imagen).HasColumnName("imagen");
            });

            modelBuilder.Entity<OrdenTrabajo>().ToTable("orden_trabajo");
            modelBuilder.Entity<DetallePedido>().ToTable("detalle_pedido");
        }
    }
}