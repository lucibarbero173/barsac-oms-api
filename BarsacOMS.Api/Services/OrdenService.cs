using BarsacOMS.Api.Data;
using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BarsacOMS.Api.Services
{
    public class OrdenService : IOrdenService
    {
        private readonly AppDbContext _context;

        public OrdenService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<OrdenTrabajo> CrearOrdenAsync(CrearOrdenDTO dto)
        {
            var cliente = await _context.Clientes.FindAsync(dto.ClienteId)
                ?? throw new InvalidOperationException($"El cliente especificado ({dto.ClienteId}) no existe.");

            var orden = new OrdenTrabajo
            {
                ClienteId = cliente.Id,
                NombreCliente = cliente.Nombre ?? "",
                Telefono = cliente.Telefono ?? "",
                Solicitante = cliente.Solicitante ?? "",
                Disciplina = cliente.Disciplina ?? "",
                ListaPrecios = cliente.ListaPrecios ?? "",
                FechaPedido = dto.FechaPedido,
                FechaEntrega = dto.FechaEntrega,
                Estado = dto.Estado,
                // Seña y otros cobros NO se cargan desde el pedido: los suma CobroService
                // cada vez que se registra un cobro (botón Registrar Cobro o pantalla Cobros),
                // así lo que dice el pedido siempre coincide con Cobros y Conciliación.
                Senas = 0,
                OtrosCobros = 0,
                FormaPago = dto.FormaPago, // define la lista de precios (efectivo / transferencia)
                Detalles = new List<DetallePedido>()
            };

            await MapearYCalcularDetallesAsync(orden, dto.Detalles);

            _context.Ordenes.Add(orden);
            await _context.SaveChangesAsync();

            return orden;
        }

        public async Task<OrdenTrabajo?> EditarOrdenAsync(int id, CrearOrdenDTO dto)
        {
            var orden = await _context.Ordenes
                .Include(o => o.Detalles)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (orden == null) return null;

            var cliente = await _context.Clientes.FindAsync(dto.ClienteId)
                ?? throw new InvalidOperationException($"El cliente especificado ({dto.ClienteId}) no existe.");

            // Actualizar Snapshot del Cliente y Fechas/Cobros
            orden.ClienteId = cliente.Id;
            orden.NombreCliente = cliente.Nombre ?? "";
            orden.Telefono = cliente.Telefono ?? "";
            orden.Solicitante = cliente.Solicitante ?? "";
            orden.Disciplina = cliente.Disciplina ?? "";
            orden.ListaPrecios = cliente.ListaPrecios ?? "";
            orden.FechaPedido = dto.FechaPedido;
            orden.FechaEntrega = dto.FechaEntrega;
            orden.Estado = dto.Estado;
            // Senas / OtrosCobros no se tocan: solo cambian al registrar, editar o borrar un cobro
            orden.FormaPago = dto.FormaPago;

            // Reemplazar renglones viejos por los nuevos
            _context.Detalles.RemoveRange(orden.Detalles);
            orden.Detalles.Clear();

            await MapearYCalcularDetallesAsync(orden, dto.Detalles);

            await _context.SaveChangesAsync();
            return orden;
        }

        public async Task<OrdenTrabajo?> ObtenerOrdenPorIdAsync(int id)
        {
            return await _context.Ordenes
                .Include(o => o.Detalles)
                    .ThenInclude(d => d.Producto)
                .FirstOrDefaultAsync(o => o.Id == id);
        }

        public async Task<IEnumerable<OrdenListDTO>> ObtenerOrdenesAsync()
        {
            // 1. Obtenemos las órdenes de la base de datos trayendo sus Detalles
            var ordenes = await _context.Ordenes
                .Include(o => o.Detalles)
                .AsNoTracking()
                .ToListAsync();

            // 1.b Cantidad de prendas ya escaneadas en Control, por orden (para el estado "Control" en progreso)
            var controladasPorOrden = await (
                from f in _context.FichasProduccion
                join d in _context.DetallesFichaProduccion on f.Id equals d.FichaProduccionId
                join p in _context.PrendasUnidad on d.Id equals p.DetalleFichaProduccionId
                where p.Controlada
                group p by f.OrdenId into g
                select new { OrdenId = g.Key, Cantidad = g.Count() }
            ).ToListAsync();
            var controladasDict = controladasPorOrden.ToDictionary(x => x.OrdenId, x => x.Cantidad);

            // 2. Mapeamos a DTO en memoria para evitar errores de traducción LINQ/EF Core
            return ordenes.Select(o => new OrdenListDTO
            {
                Id = o.Id,
                FechaPedido = o.FechaPedido,
                FechaEntrega = o.FechaEntrega,
                ClienteId = o.ClienteId,
                NombreCliente = o.NombreCliente ?? "Sin Cliente",
                Solicitante = o.Solicitante ?? "",
                Disciplina = o.Disciplina ?? "",
                CantidadPrendas = o.Detalles != null && o.Detalles.Any() ? o.Detalles.Sum(d => d.Cantidad) : 0,
                ImporteTotal = o.ImporteTotal,
                Senas = o.Senas ?? 0,
                OtrosCobros = o.OtrosCobros,
                Saldo = o.Saldo,
                Estado = o.Estado,
                PrendasControladas = controladasDict.TryGetValue(o.Id, out var cantidadControlada) ? cantidadControlada : 0
            });
        }

        public async Task<bool> EliminarOrdenAsync(int id)
        {
            var orden = await _context.Ordenes
                .Include(o => o.Detalles) // Si tienes detalles asociados
                .FirstOrDefaultAsync(o => o.Id == id);

            if (orden == null) return false;

            _context.Ordenes.Remove(orden);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> CambiarEstadoAsync(int id, EstadoOrden nuevoEstado)
        {
            var orden = await _context.Ordenes.FindAsync(id);
            if (orden == null) return false;

            orden.Estado = nuevoEstado;
            await _context.SaveChangesAsync();
            return true;
        }

        private async Task MapearYCalcularDetallesAsync(OrdenTrabajo orden, List<CrearDetalleDTO> detallesDto)
        {
            decimal totalGeneral = 0;

            if (detallesDto != null)
            {
                foreach (var d in detallesDto)
                {
                    var producto = await _context.Productos.FindAsync(d.ProductoId)
                        ?? throw new InvalidOperationException($"El producto {d.ProductoId} no existe.");

                    // 🛠️ CORRECCIÓN AQUÍ: leer d.PrecioUnitario en lugar de d.Precio
                    var precioUnitario = d.PrecioUnitario;
                    var total = precioUnitario * d.Cantidad;

                    orden.Detalles.Add(new DetallePedido
                    {
                        ProductoId = d.ProductoId,
                        Talle = d.Talle,
                        Cantidad = d.Cantidad,
                        PrecioUnitario = precioUnitario,
                        Total = total
                    });

                    totalGeneral += total;
                }
            }

            orden.ImporteTotal = totalGeneral;
            orden.Saldo = totalGeneral - (orden.Senas ?? 0) - (orden.OtrosCobros ?? 0);
        }
    }
}