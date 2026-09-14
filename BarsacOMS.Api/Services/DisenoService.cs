using BarsacOMS.Api.Data;
using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BarsacOMS.Api.Services
{
    public class DisenoService : IDisenoService
    {
        private readonly AppDbContext _context;

        public DisenoService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<FichaResumenEtapaDto>> ObtenerFichasPendientesAsync()
        {
            var fichas = await _context.FichasProduccion
                .Include(f => f.Orden)
                .Include(f => f.Items)
                    .ThenInclude(i => i.Unidades)
                .Where(f => f.Orden.Estado == EstadoOrden.Pendiente || f.Orden.Estado == EstadoOrden.EnProceso)
                .ToListAsync();

            return fichas.Select(f => new FichaResumenEtapaDto
            {
                FichaId = f.Id,
                OrdenId = f.OrdenId,
                Cliente = f.Orden.NombreCliente,
                FechaEntrega = f.Orden.FechaEntrega,
                Total = f.Items.Sum(i => i.Unidades.Count),
                Completadas = f.Items.Sum(i => i.Unidades.Count(u => u.DisenoListo)),
                Estado = f.Orden.Estado
            }).ToList();
        }

        public async Task<FichaDetalleEtapaDto?> ObtenerFichaAsync(int fichaId)
        {
            var ficha = await _context.FichasProduccion
                .Include(f => f.Orden)
                .Include(f => f.Items)
                    .ThenInclude(i => i.Unidades)
                .FirstOrDefaultAsync(f => f.Id == fichaId);

            if (ficha == null) return null;

            return new FichaDetalleEtapaDto
            {
                FichaId = ficha.Id,
                OrdenId = ficha.OrdenId,
                Cliente = ficha.Orden.NombreCliente,
                FechaEntrega = ficha.Orden.FechaEntrega,
                ImagenDisenoBase64 = ficha.ImagenDisenoBase64,
                Estado = ficha.Orden.Estado,
                Prendas = ficha.Items
                    .SelectMany(i => i.Unidades.Select(u => new PrendaEtapaDto
                    {
                        Id = u.Id,
                        Producto = i.Producto,
                        Talle = i.Talle,
                        Numero = i.Numero,
                        Nombre = i.Nombre,
                        Detalle = i.Detalle,
                        DisenoListo = u.DisenoListo,
                        CorteEstado = u.CorteEstado,
                        CorteDetalleFaltante = u.CorteDetalleFaltante
                    }))
                    .OrderBy(p => p.Id)
                    .ToList()
            };
        }

        public async Task<ResultadoEtapaDto?> ToggleUnidadAsync(int unidadId, int? usuarioId)
        {
            var unidad = await _context.PrendasUnidad.FindAsync(unidadId);
            if (unidad == null) return null;

            var detalle = await _context.DetallesFichaProduccion.FindAsync(unidad.DetalleFichaProduccionId);
            var ficha = await _context.FichasProduccion.FindAsync(detalle!.FichaProduccionId);
            var ordenId = ficha!.OrdenId;

            unidad.DisenoListo = !unidad.DisenoListo;
            if (unidad.DisenoListo)
            {
                unidad.FechaDiseno = DateTime.UtcNow;
                unidad.DisenoPorUsuarioId = usuarioId;
            }
            else
            {
                unidad.FechaDiseno = null;
                unidad.DisenoPorUsuarioId = null;
            }

            await _context.SaveChangesAsync();

            var (completadas, total) = await CalcularProgresoOrdenAsync(ordenId, u => u.DisenoListo);

            var orden = await _context.Ordenes.FindAsync(ordenId);
            if (orden != null && (orden.Estado == EstadoOrden.Pendiente || orden.Estado == EstadoOrden.EnProceso))
            {
                if (total > 0 && completadas == total)
                {
                    orden.Estado = EstadoOrden.Corte;
                }
                else if (completadas > 0)
                {
                    orden.Estado = EstadoOrden.EnProceso; // ya se empezó a trabajar en el diseño
                }
                await _context.SaveChangesAsync();
            }

            return new ResultadoEtapaDto
            {
                Encontrada = true,
                Completadas = completadas,
                Total = total,
                NuevoEstadoOrden = orden?.Estado ?? EstadoOrden.EnProceso
            };
        }

        public async Task<List<AlertaFaltanteDto>> ObtenerAlertasFaltantesAsync()
        {
            var fichas = await _context.FichasProduccion
                .Include(f => f.Orden)
                .Include(f => f.Items)
                    .ThenInclude(i => i.Unidades)
                .Where(f => f.Orden.Estado == EstadoOrden.CorteFaltantes)
                .ToListAsync();

            return fichas.Select(f => new AlertaFaltanteDto
            {
                FichaId = f.Id,
                OrdenId = f.OrdenId,
                Cliente = f.Orden.NombreCliente,
                Faltantes = f.Items
                    .SelectMany(i => i.Unidades
                        .Where(u => u.CorteEstado == EstadoCorte.Faltante)
                        .Select(u => new PrendaFaltanteDto
                        {
                            Producto = i.Producto,
                            Talle = i.Talle,
                            Nombre = i.Nombre,
                            Detalle = i.Detalle,
                            DetalleFaltante = u.CorteDetalleFaltante ?? ""
                        }))
                    .ToList()
            }).Where(a => a.Faltantes.Count > 0).ToList();
        }

        private async Task<(int Completadas, int Total)> CalcularProgresoOrdenAsync(int ordenId, Func<PrendaUnidad, bool> completadaPredicado)
        {
            var query =
                from f in _context.FichasProduccion
                where f.OrdenId == ordenId
                join d in _context.DetallesFichaProduccion on f.Id equals d.FichaProduccionId
                join p in _context.PrendasUnidad on d.Id equals p.DetalleFichaProduccionId
                select p;

            var unidades = await query.ToListAsync();
            var completadas = unidades.Count(completadaPredicado);
            return (completadas, unidades.Count);
        }
    }
}
