using BarsacOMS.Api.Data;
using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BarsacOMS.Api.Services
{
    // Etapa Impresión (entre Diseño y Corte). Se trabaja por ficha completa: los archivos se
    // arman por producto/tela, así que se muestra el resumen (ej. "15 Remera Cool") y la ruta
    // que dejó Diseño, y se marca la ficha entera como impresa.
    public class ImpresionService : IImpresionService
    {
        private readonly AppDbContext _context;

        public ImpresionService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<FichaImpresionDto>> ObtenerFichasPendientesAsync()
        {
            var fichas = await ConsultarAsync(_context.FichasProduccion.Where(f => f.EstadoFicha == EstadoOrden.Impresion));
            return fichas.OrderBy(f => f.FechaEntrega ?? DateTime.MaxValue).ToList();
        }

        // Las últimas impresas, por si hay que volver a mirar dónde estaba un archivo
        public async Task<List<FichaImpresionDto>> ObtenerFichasRecienImpresasAsync()
        {
            var fichas = await ConsultarAsync(_context.FichasProduccion
                .Where(f => f.FechaImpresion != null)
                .OrderByDescending(f => f.FechaImpresion)
                .Take(20));
            return fichas.OrderByDescending(f => f.FechaImpresion).ToList();
        }

        public async Task<FichaImpresionDto?> ObtenerFichaAsync(int fichaId)
        {
            var ficha = (await ConsultarAsync(_context.FichasProduccion.Where(f => f.Id == fichaId))).FirstOrDefault();
            if (ficha == null) return null;

            ficha.ImagenDisenoBase64 = await _context.FichasProduccion
                .Where(f => f.Id == fichaId)
                .Select(f => f.ImagenDisenoBase64)
                .FirstOrDefaultAsync();
            return ficha;
        }

        public async Task<(bool Exito, string? Error)> MarcarImpresaAsync(int fichaId, int? usuarioId)
        {
            var ficha = await _context.FichasProduccion.FindAsync(fichaId);
            if (ficha == null) return (false, "Ficha no encontrada.");
            if (ficha.EstadoFicha != EstadoOrden.Impresion) return (false, "Esta ficha no está en Impresión.");

            ficha.FechaImpresion = DateTime.UtcNow;
            ficha.ImpresoPorUsuarioId = usuarioId;
            ficha.EstadoFicha = EstadoOrden.Corte;
            await _context.SaveChangesAsync();

            await RecalcularEstadoOrdenAsync(ficha.OrdenId);
            return (true, null);
        }

        // Por si se marcó por error: vuelve a Impresión mientras Corte no haya empezado
        public async Task<(bool Exito, string? Error)> DeshacerImpresionAsync(int fichaId)
        {
            var ficha = await _context.FichasProduccion.FindAsync(fichaId);
            if (ficha == null) return (false, "Ficha no encontrada.");
            if (ficha.EstadoFicha != EstadoOrden.Corte)
                return (false, "Solo se puede deshacer mientras la ficha está en Corte sin empezar.");

            var corteEmpezado = await (
                from d in _context.DetallesFichaProduccion
                where d.FichaProduccionId == fichaId
                join u in _context.PrendasUnidad on d.Id equals u.DetalleFichaProduccionId
                select u
            ).AnyAsync(u => u.CorteEstado != EstadoCorte.Pendiente);

            if (corteEmpezado) return (false, "Corte ya empezó a trabajar esta ficha, no se puede deshacer.");

            ficha.EstadoFicha = EstadoOrden.Impresion;
            ficha.FechaImpresion = null;
            ficha.ImpresoPorUsuarioId = null;
            await _context.SaveChangesAsync();

            await RecalcularEstadoOrdenAsync(ficha.OrdenId);
            return (true, null);
        }

        // Proyección liviana (sin la imagen) con los datos del pedido y el resumen por producto
        private async Task<List<FichaImpresionDto>> ConsultarAsync(IQueryable<FichaProduccion> consulta)
        {
            var fichas = await consulta
                .AsNoTracking()
                .Select(f => new
                {
                    f.Id,
                    f.OrdenId,
                    f.Orden.FechaPedido,
                    f.Orden.ClienteId,
                    f.Orden.NombreCliente,
                    f.Orden.Solicitante,
                    f.Orden.FechaEntrega,
                    f.RutaImpresion,
                    f.FechaImpresion,
                    Items = f.Items.Select(i => new { i.Producto, i.Cantidades }).ToList()
                })
                .ToListAsync();

            return fichas.Select(f =>
            {
                var productos = f.Items
                    .GroupBy(i => i.Producto)
                    .Select(g => new ProductoCantidadDto { Producto = g.Key, Cantidad = g.Sum(i => i.Cantidades) })
                    .OrderBy(p => p.Producto)
                    .ToList();

                return new FichaImpresionDto
                {
                    FichaId = f.Id,
                    OrdenId = f.OrdenId,
                    FechaPedido = f.FechaPedido,
                    ClienteId = f.ClienteId,
                    Cliente = f.NombreCliente,
                    Solicitante = f.Solicitante,
                    FechaEntrega = f.FechaEntrega,
                    RutaImpresion = f.RutaImpresion,
                    FechaImpresion = f.FechaImpresion.HasValue ? f.FechaImpresion.Value.AddHours(-3) : null, // hora Argentina
                    Productos = productos,
                    TotalPrendas = productos.Sum(p => p.Cantidad)
                };
            }).ToList();
        }

        // El estado de la ORDEN pasa a ser el de su ficha más atrasada
        private async Task RecalcularEstadoOrdenAsync(int ordenId)
        {
            var orden = await _context.Ordenes.FindAsync(ordenId);
            if (orden == null || !EtapasProduccion.EstadosDeProduccion.Contains(orden.Estado)) return;

            var fichas = await _context.FichasProduccion.Where(f => f.OrdenId == ordenId).ToListAsync();
            if (fichas.Count == 0) return;

            orden.Estado = EtapasProduccion.MasAtrasada(fichas.Select(f => f.EstadoFicha));
            await _context.SaveChangesAsync();
        }
    }
}
