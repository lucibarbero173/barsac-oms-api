using BarsacOMS.Api.Data;
using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BarsacOMS.Api.Services
{
    public class CorteService : ICorteService
    {
        private readonly AppDbContext _context;

        public CorteService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<FichaResumenEtapaDto>> ObtenerFichasPendientesAsync()
        {
            var fichas = await _context.FichasProduccion
                .Include(f => f.Orden)
                .Include(f => f.Items)
                    .ThenInclude(i => i.Unidades)
                .Where(f => f.Orden.Estado == EstadoOrden.Corte || f.Orden.Estado == EstadoOrden.CorteFaltantes)
                .ToListAsync();

            return fichas.Select(f => new FichaResumenEtapaDto
            {
                FichaId = f.Id,
                OrdenId = f.OrdenId,
                Cliente = f.Orden.NombreCliente,
                FechaEntrega = f.Orden.FechaEntrega,
                Total = f.Items.Sum(i => i.Unidades.Count),
                Completadas = f.Items.Sum(i => i.Unidades.Count(u => u.CorteEstado == EstadoCorte.Completo)),
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

        public async Task<ResultadoEtapaDto?> CompletarUnidadAsync(int unidadId, int? usuarioId)
        {
            var unidad = await _context.PrendasUnidad.FindAsync(unidadId);
            if (unidad == null) return null;

            unidad.CorteEstado = EstadoCorte.Completo;
            unidad.CorteDetalleFaltante = null;
            unidad.FechaCorte = DateTime.UtcNow;
            unidad.CortadoPorUsuarioId = usuarioId;

            return await GuardarYRecalcularAsync(unidad);
        }

        public async Task<ResultadoEtapaDto?> RegistrarFaltanteAsync(int unidadId, string detalle, int? usuarioId)
        {
            var unidad = await _context.PrendasUnidad.FindAsync(unidadId);
            if (unidad == null) return null;

            unidad.CorteEstado = EstadoCorte.Faltante;
            unidad.CorteDetalleFaltante = detalle;
            unidad.FechaCorte = DateTime.UtcNow;
            unidad.CortadoPorUsuarioId = usuarioId;

            return await GuardarYRecalcularAsync(unidad);
        }

        public async Task<ResultadoEtapaDto?> DeshacerUnidadAsync(int unidadId)
        {
            var unidad = await _context.PrendasUnidad.FindAsync(unidadId);
            if (unidad == null) return null;

            unidad.CorteEstado = EstadoCorte.Pendiente;
            unidad.CorteDetalleFaltante = null;
            unidad.FechaCorte = null;
            unidad.CortadoPorUsuarioId = null;

            return await GuardarYRecalcularAsync(unidad);
        }

        private async Task<ResultadoEtapaDto> GuardarYRecalcularAsync(PrendaUnidad unidad)
        {
            var detalle = await _context.DetallesFichaProduccion.FindAsync(unidad.DetalleFichaProduccionId);
            var ficha = await _context.FichasProduccion.FindAsync(detalle!.FichaProduccionId);
            var ordenId = ficha!.OrdenId;

            await _context.SaveChangesAsync();

            var unidadesOrden = await (
                from f in _context.FichasProduccion
                where f.OrdenId == ordenId
                join d in _context.DetallesFichaProduccion on f.Id equals d.FichaProduccionId
                join p in _context.PrendasUnidad on d.Id equals p.DetalleFichaProduccionId
                select p
            ).ToListAsync();

            var total = unidadesOrden.Count;
            var completadas = unidadesOrden.Count(u => u.CorteEstado == EstadoCorte.Completo);
            var faltantes = unidadesOrden.Count(u => u.CorteEstado == EstadoCorte.Faltante);

            var orden = await _context.Ordenes.FindAsync(ordenId);
            if (orden != null && (orden.Estado == EstadoOrden.Corte || orden.Estado == EstadoOrden.CorteFaltantes || orden.Estado == EstadoOrden.AptoConfeccion))
            {
                if (faltantes > 0)
                {
                    orden.Estado = EstadoOrden.CorteFaltantes;
                }
                else if (total > 0 && completadas == total)
                {
                    orden.Estado = EstadoOrden.AptoConfeccion;
                }
                else
                {
                    orden.Estado = EstadoOrden.Corte;
                }
                await _context.SaveChangesAsync();
            }

            return new ResultadoEtapaDto
            {
                Encontrada = true,
                Completadas = completadas,
                Total = total,
                NuevoEstadoOrden = orden?.Estado ?? EstadoOrden.Corte
            };
        }
    }
}
