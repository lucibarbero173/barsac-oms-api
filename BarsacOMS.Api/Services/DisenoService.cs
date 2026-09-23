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
                .Where(f => f.EstadoFicha == EstadoOrden.Pendiente || f.EstadoFicha == EstadoOrden.EnProceso)
                .ToListAsync();

            return fichas.Select(f => new FichaResumenEtapaDto
            {
                FichaId = f.Id,
                OrdenId = f.OrdenId,
                Cliente = f.Orden.NombreCliente,
                FechaEntrega = f.Orden.FechaEntrega,
                Total = f.Items.Sum(i => i.Unidades.Count),
                Completadas = f.Items.Sum(i => i.Unidades.Count(u => u.DisenoListo)),
                Estado = f.EstadoFicha
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
                Estado = ficha.EstadoFicha,
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
                        CorteParteFaltante = u.CorteParteFaltante,
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

            // El progreso y el cambio de estado son de ESTA ficha nada más, no de toda la
            // orden: si la orden tiene otra ficha ya más avanzada, no se debe tocar.
            var (completadas, total) = await CalcularProgresoFichaAsync(ficha.Id, u => u.DisenoListo);

            if (ficha.EstadoFicha == EstadoOrden.Pendiente || ficha.EstadoFicha == EstadoOrden.EnProceso)
            {
                if (total > 0 && completadas == total)
                {
                    ficha.EstadoFicha = EstadoOrden.Corte;
                }
                else if (completadas > 0)
                {
                    ficha.EstadoFicha = EstadoOrden.EnProceso; // ya se empezó a trabajar en el diseño
                }
                await _context.SaveChangesAsync();
            }

            await RecalcularEstadoOrdenAsync(ordenId);
            var orden = await _context.Ordenes.FindAsync(ordenId);

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
                .Where(f => f.EstadoFicha == EstadoOrden.CorteFaltantes)
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
                            Parte = u.CorteParteFaltante ?? ParteFaltante.Completa,
                            DetalleFaltante = u.CorteDetalleFaltante
                        }))
                    .ToList()
            }).Where(a => a.Faltantes.Count > 0).ToList();
        }

        private async Task<(int Completadas, int Total)> CalcularProgresoFichaAsync(int fichaId, Func<PrendaUnidad, bool> completadaPredicado)
        {
            var query =
                from d in _context.DetallesFichaProduccion
                where d.FichaProduccionId == fichaId
                join p in _context.PrendasUnidad on d.Id equals p.DetalleFichaProduccionId
                select p;

            var unidades = await query.ToListAsync();
            var completadas = unidades.Count(completadaPredicado);
            return (completadas, unidades.Count);
        }

        // Solo estos valores son estados de PRODUCCIÓN (los que puede tomar una ficha).
        // Si la orden ya está en un estado de entrega (Entregado/EntregadoParcial/
        // ListoParaEntregar), un toggle de diseño en una ficha no debe pisarlo.
        private static readonly HashSet<EstadoOrden> EstadosDeProduccion = new()
        {
            EstadoOrden.Pendiente, EstadoOrden.EnProceso, EstadoOrden.Corte, EstadoOrden.CorteFaltantes, EstadoOrden.AptoConfeccion
        };

        // El estado de la ORDEN pasa a ser el de su ficha más atrasada: así nunca se ve
        // más avanzada de lo que en realidad está, aunque tenga otra ficha ya lista.
        private async Task RecalcularEstadoOrdenAsync(int ordenId)
        {
            var orden = await _context.Ordenes.FindAsync(ordenId);
            if (orden == null || !EstadosDeProduccion.Contains(orden.Estado)) return;

            var fichas = await _context.FichasProduccion.Where(f => f.OrdenId == ordenId).ToListAsync();
            if (fichas.Count == 0) return;

            orden.Estado = (EstadoOrden)fichas.Min(f => (int)f.EstadoFicha);
            await _context.SaveChangesAsync();
        }
    }
}
