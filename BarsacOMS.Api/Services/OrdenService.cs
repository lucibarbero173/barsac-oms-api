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
                Senas = dto.Senas,
                OtrosCobros = dto.OtrosCobros,
                FormaPago = dto.FormaPago, // 👈 Asegurate que tu DTO pase la FormaPago
                Detalles = new List<DetallePedido>()
            };

            await MapearYCalcularDetallesAsync(orden, dto.Detalles);

            _context.Ordenes.Add(orden);

            // 1. Guardamos la Orden para generar el Id (orden.Id)
            await _context.SaveChangesAsync();

            // ⚡ 2. CREACIÓN AUTOMÁTICA DE COBROS ⚡
            bool huboCobrosIniciales = false;
            string medioPago = string.IsNullOrWhiteSpace(dto.FormaPago) ? "EFECTIVO" : dto.FormaPago;

            // Si hay Seña mayor a 0
            if (orden.Senas.HasValue && orden.Senas.Value > 0)
            {
                var cobroSena = new Cobro
                {
                    OrdenId = orden.Id,
                    FechaCobro = orden.FechaPedido,
                    ClienteId = orden.ClienteId,
                    NombreCliente = orden.NombreCliente,
                    NombreOrdenante = orden.Solicitante,
                    Concepto = "ENTREGA", // o "REFUERZO SEÑA" según tus categorías
                    MedioCobro = medioPago,
                    Importe = orden.Senas.Value
                };
                _context.Cobros.Add(cobroSena);
                huboCobrosIniciales = true;
            }

            // Si hay Otros Cobros mayor a 0
            if (orden.OtrosCobros.HasValue && orden.OtrosCobros.Value > 0)
            {
                var cobroOtros = new Cobro
                {
                    OrdenId = orden.Id,
                    FechaCobro = orden.FechaPedido,
                    ClienteId = orden.ClienteId,
                    NombreCliente = orden.NombreCliente,
                    NombreOrdenante = orden.Solicitante,
                    Concepto = "OTRO",
                    MedioCobro = medioPago,
                    Importe = orden.OtrosCobros.Value
                };
                _context.Cobros.Add(cobroOtros);
                huboCobrosIniciales = true;
            }

            // 3. Guardamos los cobros generados
            if (huboCobrosIniciales)
            {
                await _context.SaveChangesAsync();
            }

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
            orden.Senas = dto.Senas;
            orden.OtrosCobros = dto.OtrosCobros;
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
                Estado = o.Estado
            });
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

                    var precioUnitario = d.Precio;
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