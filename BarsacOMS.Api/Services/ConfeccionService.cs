using BarsacOMS.Api.Data;
using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BarsacOMS.Api.Services
{
    // Etapa Confección: repartir las prendas de las fichas Apto Confección entre las modistas.
    public class ConfeccionService : IConfeccionService
    {
        private readonly AppDbContext _context;

        public ConfeccionService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<FichaConfeccionResumenDto>> ObtenerFichasPorAsignarAsync()
        {
            var resumen = await ObtenerResumenesAsync(_context.FichasProduccion
                .Where(f => f.EstadoFicha == EstadoOrden.AptoConfeccion
                         && f.Items.SelectMany(i => i.Unidades).Any(u => u.ModistaId == null)));

            return resumen.OrderBy(f => f.FechaEntrega ?? DateTime.MaxValue).ToList();
        }

        // Fichas con todas sus prendas ya repartidas, para poder consultarlas o corregirlas.
        public async Task<List<FichaConfeccionResumenDto>> ObtenerFichasRecienAsignadasAsync()
        {
            var resumen = await ObtenerResumenesAsync(_context.FichasProduccion
                .Where(f => f.Items.SelectMany(i => i.Unidades).Any()
                         && f.Items.SelectMany(i => i.Unidades).All(u => u.ModistaId != null)));

            return resumen.OrderByDescending(f => f.FechaAsignacion).Take(20).ToList();
        }

        // Proyección liviana para los listados: sin la imagen del diseño ni los datos de cada renglón.
        private async Task<List<FichaConfeccionResumenDto>> ObtenerResumenesAsync(IQueryable<FichaProduccion> consulta)
        {
            var fichas = await consulta
                .AsNoTracking()
                .Select(f => new
                {
                    f.Id,
                    f.OrdenId,
                    Cliente = f.Orden.NombreCliente,
                    f.Orden.FechaEntrega,
                    Unidades = f.Items.SelectMany(i => i.Unidades)
                        .Select(u => new { u.ModistaId, u.FechaAsignacionModista })
                        .ToList()
                })
                .ToListAsync();

            var nombres = await NombresModistasAsync();

            return fichas.Select(f => new FichaConfeccionResumenDto
            {
                FichaId = f.Id,
                OrdenId = f.OrdenId,
                Cliente = f.Cliente,
                FechaEntrega = f.FechaEntrega,
                Total = f.Unidades.Count,
                Asignadas = f.Unidades.Count(u => u.ModistaId != null),
                Modistas = TextoModistas(f.Unidades.Select(u => u.ModistaId), nombres),
                FechaAsignacion = f.Unidades.Max(u => u.FechaAsignacionModista)
            }).ToList();
        }

        public async Task<FichaConfeccionDetalleDto?> ObtenerFichaAsync(int fichaId)
        {
            var ficha = await _context.FichasProduccion
                .AsNoTracking()
                .Include(f => f.Orden)
                .Include(f => f.Items)
                    .ThenInclude(i => i.Unidades)
                .FirstOrDefaultAsync(f => f.Id == fichaId);

            if (ficha == null) return null;

            var nombres = await NombresModistasAsync();

            return new FichaConfeccionDetalleDto
            {
                FichaId = ficha.Id,
                OrdenId = ficha.OrdenId,
                Cliente = ficha.Orden.NombreCliente,
                FechaEntrega = ficha.Orden.FechaEntrega,
                ImagenDisenoBase64 = ficha.ImagenDisenoBase64,
                Renglones = ficha.Items
                    .OrderBy(i => i.Id)
                    .Select(i => new RenglonConfeccionDto
                    {
                        DetalleId = i.Id,
                        Producto = i.Producto,
                        Talle = i.Talle,
                        Numero = i.Numero,
                        Nombre = i.Nombre,
                        Detalle = i.Detalle,
                        Cantidad = i.Unidades.Count,
                        Asignaciones = i.Unidades
                            .Where(u => u.ModistaId != null)
                            .GroupBy(u => u.ModistaId!.Value)
                            .Select(g => new AsignacionModistaDto
                            {
                                ModistaId = g.Key,
                                ModistaNombre = nombres.GetValueOrDefault(g.Key),
                                Cantidad = g.Count()
                            })
                            .OrderBy(a => a.ModistaNombre)
                            .ToList()
                    })
                    .ToList()
            };
        }

        // Guarda el reparto de cada renglón que venga en la lista. Se respetan las prendas que ya
        // tenía cada modista y solo se mueven las que sobran o faltan, así no cambia de manos
        // una prenda sin necesidad.
        public async Task<(bool Exito, string? Error)> GuardarAsignacionesAsync(int fichaId, List<GuardarAsignacionRenglonDto> renglones)
        {
            var ficha = await _context.FichasProduccion
                .Include(f => f.Items)
                    .ThenInclude(i => i.Unidades)
                .FirstOrDefaultAsync(f => f.Id == fichaId);

            if (ficha == null) return (false, "Ficha no encontrada.");

            var modistas = await _context.Modistas.AsNoTracking().ToDictionaryAsync(m => m.Id);
            var ahora = DateTime.UtcNow;

            // Validar todo antes de tocar nada
            foreach (var r in renglones)
            {
                var detalle = ficha.Items.FirstOrDefault(i => i.Id == r.DetalleId);
                if (detalle == null) return (false, "Hay un renglón que no pertenece a esta ficha.");

                var etiqueta = $"{detalle.Producto} - talle {detalle.Talle}";

                if (r.Asignaciones.Any(a => a.Cantidad <= 0))
                    return (false, $"En \"{etiqueta}\" hay una cantidad en cero o negativa.");

                if (r.Asignaciones.GroupBy(a => a.ModistaId).Any(g => g.Count() > 1))
                    return (false, $"En \"{etiqueta}\" hay una modista repetida.");

                var yaAsignadas = detalle.Unidades.Where(u => u.ModistaId != null).Select(u => u.ModistaId!.Value).ToHashSet();
                foreach (var a in r.Asignaciones)
                {
                    if (!modistas.TryGetValue(a.ModistaId, out var modista))
                        return (false, $"En \"{etiqueta}\" hay una modista que no existe.");
                    if (!modista.Activa && !yaAsignadas.Contains(a.ModistaId))
                        return (false, $"{modista.Nombre} está inactiva, no se le pueden asignar prendas nuevas.");
                }

                var total = r.Asignaciones.Sum(a => a.Cantidad);
                if (total > detalle.Unidades.Count)
                    return (false, $"En \"{etiqueta}\" asignaste {total} prendas y el renglón tiene {detalle.Unidades.Count}.");
            }

            foreach (var r in renglones)
            {
                var unidades = ficha.Items.First(i => i.Id == r.DetalleId).Unidades.OrderBy(u => u.Id).ToList();
                var objetivo = r.Asignaciones.ToDictionary(a => a.ModistaId, a => a.Cantidad);

                // 1) Liberar lo que sobra: modistas sacadas del renglón o con menos cantidad que antes
                foreach (var grupo in unidades.Where(u => u.ModistaId != null).GroupBy(u => u.ModistaId!.Value))
                {
                    var queda = objetivo.GetValueOrDefault(grupo.Key);
                    foreach (var u in grupo.OrderByDescending(u => u.Id).Take(Math.Max(0, grupo.Count() - queda)))
                    {
                        u.ModistaId = null;
                        u.FechaAsignacionModista = null;
                    }
                }

                // 2) Completar a cada modista con prendas libres
                foreach (var (modistaId, cantidad) in objetivo)
                {
                    var faltan = cantidad - unidades.Count(u => u.ModistaId == modistaId);
                    foreach (var u in unidades.Where(u => u.ModistaId == null).Take(faltan))
                    {
                        u.ModistaId = modistaId;
                        u.FechaAsignacionModista = ahora;
                    }
                }
            }

            ficha.Modista = TextoModistas(
                ficha.Items.SelectMany(i => i.Unidades).Select(u => u.ModistaId),
                modistas.ToDictionary(m => m.Key, m => m.Value.Nombre));

            await _context.SaveChangesAsync();
            return (true, null);
        }

        // Texto que se ve como "Modista" en la ficha (listado, ojito, impresión): las modistas
        // que tienen prendas asignadas en la ficha, separadas por coma.
        public static string TextoModistas(IEnumerable<int?> modistaIds, IReadOnlyDictionary<int, string> nombres)
        {
            var asignadas = modistaIds
                .Where(id => id != null)
                .Select(id => nombres.GetValueOrDefault(id!.Value) ?? "?")
                .Distinct()
                .OrderBy(n => n)
                .ToList();

            return asignadas.Count > 0 ? string.Join(", ", asignadas) : "Sin asignar";
        }

        private async Task<Dictionary<int, string>> NombresModistasAsync()
        {
            return await _context.Modistas.AsNoTracking().ToDictionaryAsync(m => m.Id, m => m.Nombre);
        }
    }
}
