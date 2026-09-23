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
                .Where(f => f.EstadoFicha == EstadoOrden.Corte || f.EstadoFicha == EstadoOrden.CorteFaltantes)
                .ToListAsync();

            return fichas.Select(f => new FichaResumenEtapaDto
            {
                FichaId = f.Id,
                OrdenId = f.OrdenId,
                Cliente = f.Orden.NombreCliente,
                FechaEntrega = f.Orden.FechaEntrega,
                Total = f.Items.Sum(i => i.Unidades.Count),
                Completadas = f.Items.Sum(i => i.Unidades.Count(u => u.CorteEstado == EstadoCorte.Completo)),
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

        public async Task<ResultadoEtapaDto?> CompletarUnidadAsync(int unidadId, int? usuarioId)
        {
            var unidad = await _context.PrendasUnidad.FindAsync(unidadId);
            if (unidad == null) return null;

            unidad.CorteEstado = EstadoCorte.Completo;
            // OJO: no se limpian CorteParteFaltante/CorteDetalleFaltante acá. Si la unidad
            // venía de un Faltante ya resuelto, se conservan como registro histórico para
            // poder sacar estadísticas de scrap aunque la prenda ya haya quedado bien.
            unidad.FechaCorte = DateTime.UtcNow;
            unidad.CortadoPorUsuarioId = usuarioId;

            return await GuardarYRecalcularAsync(unidad);
        }

        public async Task<ResultadoEtapaDto?> RegistrarFaltanteAsync(int unidadId, ParteFaltante parte, string? detalle, int? usuarioId)
        {
            var unidad = await _context.PrendasUnidad.FindAsync(unidadId);
            if (unidad == null) return null;

            unidad.CorteEstado = EstadoCorte.Faltante;
            unidad.CorteParteFaltante = parte;
            unidad.CorteDetalleFaltante = string.IsNullOrWhiteSpace(detalle) ? null : detalle.Trim();
            unidad.FechaCorte = DateTime.UtcNow;
            unidad.CortadoPorUsuarioId = usuarioId;

            return await GuardarYRecalcularAsync(unidad);
        }

        public async Task<ResultadoEtapaDto?> DeshacerUnidadAsync(int unidadId)
        {
            var unidad = await _context.PrendasUnidad.FindAsync(unidadId);
            if (unidad == null) return null;

            unidad.CorteEstado = EstadoCorte.Pendiente;
            unidad.CorteParteFaltante = null;
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

            // El progreso y el cambio de estado son de ESTA ficha nada más (antes se
            // mezclaban las prendas de todas las fichas de la orden, así que una ficha
            // recién creada podía "heredar" el estado avanzado de otra ficha vieja).
            var unidadesFicha = await (
                from d in _context.DetallesFichaProduccion
                where d.FichaProduccionId == ficha.Id
                join p in _context.PrendasUnidad on d.Id equals p.DetalleFichaProduccionId
                select p
            ).ToListAsync();

            var total = unidadesFicha.Count;
            var completadas = unidadesFicha.Count(u => u.CorteEstado == EstadoCorte.Completo);
            var faltantes = unidadesFicha.Count(u => u.CorteEstado == EstadoCorte.Faltante);

            if (ficha.EstadoFicha == EstadoOrden.Corte || ficha.EstadoFicha == EstadoOrden.CorteFaltantes || ficha.EstadoFicha == EstadoOrden.AptoConfeccion)
            {
                if (faltantes > 0)
                {
                    ficha.EstadoFicha = EstadoOrden.CorteFaltantes;
                }
                else if (total > 0 && completadas == total)
                {
                    ficha.EstadoFicha = EstadoOrden.AptoConfeccion;
                }
                else
                {
                    ficha.EstadoFicha = EstadoOrden.Corte;
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
                NuevoEstadoOrden = orden?.Estado ?? EstadoOrden.Corte
            };
        }

        // Solo estos valores son estados de PRODUCCIÓN (los que puede tomar una ficha).
        // Si la orden ya está en un estado de entrega (Entregado/EntregadoParcial/
        // ListoParaEntregar), avanzar el corte de una ficha no debe pisarlo.
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
