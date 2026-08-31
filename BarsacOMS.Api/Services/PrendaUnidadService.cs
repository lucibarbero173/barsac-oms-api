using BarsacOMS.Api.Data;
using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BarsacOMS.Api.Services
{
    public class PrendaUnidadService : IPrendaUnidadService
    {
        private readonly AppDbContext _context;

        public PrendaUnidadService(AppDbContext context)
        {
            _context = context;
        }

        public Task GenerarUnidadesAsync(DetalleFichaProduccion item)
        {
            for (int i = 0; i < item.Cantidades; i++)
            {
                _context.PrendasUnidad.Add(new PrendaUnidad { DetalleFichaProduccionId = item.Id });
            }
            return Task.CompletedTask;
        }

        public async Task<List<PrendaUnidadDto>> ObtenerPorFichaAsync(int fichaId)
        {
            var query =
                from pu in _context.PrendasUnidad
                join d in _context.DetallesFichaProduccion on pu.DetalleFichaProduccionId equals d.Id
                join f in _context.FichasProduccion on d.FichaProduccionId equals f.Id
                where d.FichaProduccionId == fichaId
                orderby pu.Id
                select new PrendaUnidadDto
                {
                    Id = pu.Id,
                    DetalleFichaProduccionId = pu.DetalleFichaProduccionId,
                    OrdenId = f.OrdenId,
                    Producto = d.Producto,
                    Talle = d.Talle,
                    Numero = d.Numero,
                    Nombre = d.Nombre,
                    Detalle = d.Detalle,
                    Controlada = pu.Controlada,
                    FechaControl = pu.FechaControl
                };

            return await query.ToListAsync();
        }

        public async Task<EscanearResultadoDto?> EscanearAsync(int prendaUnidadId, int? usuarioId)
        {
            var pu = await _context.PrendasUnidad.FindAsync(prendaUnidadId);
            if (pu == null) return null;

            var detalle = await _context.DetallesFichaProduccion.FindAsync(pu.DetalleFichaProduccionId);
            var ficha = await _context.FichasProduccion.FindAsync(detalle!.FichaProduccionId);
            var ordenId = ficha!.OrdenId;

            var prendaDto = new PrendaUnidadDto
            {
                Id = pu.Id,
                DetalleFichaProduccionId = pu.DetalleFichaProduccionId,
                OrdenId = ordenId,
                Producto = detalle.Producto,
                Talle = detalle.Talle,
                Numero = detalle.Numero,
                Nombre = detalle.Nombre,
                Detalle = detalle.Detalle,
                Controlada = pu.Controlada,
                FechaControl = pu.FechaControl
            };

            bool yaEstabaControlada = pu.Controlada;

            if (!yaEstabaControlada)
            {
                pu.Controlada = true;
                pu.FechaControl = DateTime.UtcNow;
                pu.ControladoPorUsuarioId = usuarioId;
                await _context.SaveChangesAsync();

                prendaDto.Controlada = true;
                prendaDto.FechaControl = pu.FechaControl;
            }

            var (controladas, total) = await CalcularProgresoOrdenAsync(ordenId);

            bool listoParaEntregar = total > 0 && controladas == total;
            if (listoParaEntregar)
            {
                var orden = await _context.Ordenes.FindAsync(ordenId);
                if (orden != null && orden.Estado != EstadoOrden.Entregado && orden.Estado != EstadoOrden.Cancelado)
                {
                    orden.Estado = EstadoOrden.ListoParaEntregar;
                    await _context.SaveChangesAsync();
                }
            }

            return new EscanearResultadoDto
            {
                Encontrada = true,
                YaEstabaControlada = yaEstabaControlada,
                Prenda = prendaDto,
                Controladas = controladas,
                Total = total,
                OrdenListaParaEntregar = listoParaEntregar
            };
        }

        public async Task<ResumenControlOrdenDto?> ObtenerResumenPorOrdenAsync(int ordenId)
        {
            var existeOrden = await _context.Ordenes.AnyAsync(o => o.Id == ordenId);
            if (!existeOrden) return null;

            var (controladas, total) = await CalcularProgresoOrdenAsync(ordenId);

            return new ResumenControlOrdenDto
            {
                OrdenId = ordenId,
                Total = total,
                Controladas = controladas,
                Pendientes = total - controladas,
                ListoParaEntregar = total > 0 && controladas == total
            };
        }

        private async Task<(int Controladas, int Total)> CalcularProgresoOrdenAsync(int ordenId)
        {
            var estados = await (
                from f in _context.FichasProduccion
                where f.OrdenId == ordenId
                join d in _context.DetallesFichaProduccion on f.Id equals d.FichaProduccionId
                join p in _context.PrendasUnidad on d.Id equals p.DetalleFichaProduccionId
                select p.Controlada
            ).ToListAsync();

            return (estados.Count(c => c), estados.Count);
        }
    }
}
