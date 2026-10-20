using BarsacOMS.Api.Data;
using BarsacOMS.Api.DTOs;
using Microsoft.EntityFrameworkCore;

namespace BarsacOMS.Api.Services
{
    // Pantalla de la modista: ve solo las prendas que le asignaron y marca las que cose.
    public class MisPrendasService : IMisPrendasService
    {
        private readonly AppDbContext _context;

        public MisPrendasService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<int?> ObtenerModistaIdAsync(int usuarioId)
        {
            return await _context.Modistas
                .Where(m => m.UsuarioId == usuarioId)
                .Select(m => (int?)m.Id)
                .FirstOrDefaultAsync();
        }

        // terminadas = false: fichas donde todavía le queda algo por coser.
        // terminadas = true: las últimas 20 que ya cosió completas.
        public async Task<List<FichaModistaDto>> ObtenerFichasAsync(int modistaId, bool terminadas)
        {
            var consulta = _context.FichasProduccion
                .Where(f => f.Items.SelectMany(i => i.Unidades).Any(u => u.ModistaId == modistaId));

            consulta = terminadas
                ? consulta.Where(f => f.Items.SelectMany(i => i.Unidades).Where(u => u.ModistaId == modistaId).All(u => u.Cosida))
                : consulta.Where(f => f.Items.SelectMany(i => i.Unidades).Any(u => u.ModistaId == modistaId && !u.Cosida));

            // Proyección sin la imagen (se pide aparte, solo si la quiere ver)
            var fichas = await consulta
                .AsNoTracking()
                .Select(f => new
                {
                    f.Id,
                    f.OrdenId,
                    Cliente = f.Orden.NombreCliente,
                    f.Orden.FechaEntrega,
                    TieneImagen = f.ImagenDisenoBase64 != null && f.ImagenDisenoBase64 != "",
                    Renglones = f.Items
                        .Where(i => i.Unidades.Any(u => u.ModistaId == modistaId))
                        .OrderBy(i => i.Id)
                        .Select(i => new
                        {
                            i.Id,
                            i.Producto,
                            i.Talle,
                            i.Numero,
                            i.Nombre,
                            i.Detalle,
                            Asignadas = i.Unidades.Count(u => u.ModistaId == modistaId),
                            Cosidas = i.Unidades.Count(u => u.ModistaId == modistaId && u.Cosida),
                            UltimaCosida = i.Unidades.Where(u => u.ModistaId == modistaId).Max(u => u.FechaCosida)
                        })
                        .ToList()
                })
                .ToListAsync();

            var resultado = fichas.Select(f => new FichaModistaDto
            {
                FichaId = f.Id,
                OrdenId = f.OrdenId,
                Cliente = f.Cliente,
                FechaEntrega = f.FechaEntrega,
                TieneImagen = f.TieneImagen,
                Asignadas = f.Renglones.Sum(r => r.Asignadas),
                Cosidas = f.Renglones.Sum(r => r.Cosidas),
                FechaUltimaCosida = f.Renglones.Max(r => r.UltimaCosida),
                Renglones = f.Renglones.Select(r => new RenglonModistaDto
                {
                    DetalleId = r.Id,
                    Producto = r.Producto,
                    Talle = r.Talle,
                    Numero = r.Numero,
                    Nombre = r.Nombre,
                    Detalle = r.Detalle,
                    Asignadas = r.Asignadas,
                    Cosidas = r.Cosidas
                }).ToList()
            });

            return terminadas
                ? resultado.OrderByDescending(f => f.FechaUltimaCosida).Take(20).ToList()
                : resultado.OrderBy(f => f.FechaEntrega ?? DateTime.MaxValue).ToList();
        }

        public async Task<string?> ObtenerImagenAsync(int modistaId, int fichaId)
        {
            return await _context.FichasProduccion
                .Where(f => f.Id == fichaId
                         && f.Items.SelectMany(i => i.Unidades).Any(u => u.ModistaId == modistaId))
                .Select(f => f.ImagenDisenoBase64)
                .FirstOrDefaultAsync();
        }

        // Deja exactamente "cosidas" prendas cosidas de las que esta modista tiene en el renglón.
        public async Task<(bool Exito, string? Error)> MarcarCosidasAsync(int modistaId, int detalleId, int cosidas)
        {
            var detalle = await _context.DetallesFichaProduccion
                .Include(d => d.Unidades)
                .FirstOrDefaultAsync(d => d.Id == detalleId);

            var mias = detalle?.Unidades.Where(u => u.ModistaId == modistaId).OrderBy(u => u.Id).ToList();
            if (detalle == null || mias!.Count == 0) return (false, "Ese renglón no está asignado a vos.");

            if (cosidas < 0 || cosidas > mias.Count)
                return (false, $"Tenés {mias.Count} prendas asignadas en este renglón.");

            var yaCosidas = mias.Count(u => u.Cosida);

            if (cosidas > yaCosidas)
            {
                var precio = await TarifaAsync(modistaId, detalle.Producto);
                var ahora = DateTime.UtcNow;

                foreach (var u in mias.Where(u => !u.Cosida).Take(cosidas - yaCosidas))
                {
                    u.Cosida = true;
                    u.FechaCosida = ahora;
                    u.PrecioCosido = precio;
                }
            }
            else if (cosidas < yaCosidas)
            {
                // Lo que ya se le pagó no se puede desmarcar (descuadraría la liquidación)
                var pagadas = mias.Count(u => u.Cosida && u.PagoModistaId != null);
                if (cosidas < pagadas)
                    return (false, $"{pagadas} de estas prendas ya te las pagaron, no se pueden desmarcar.");

                // Se desmarcan las últimas que marcó (por si se equivocó de número)
                foreach (var u in mias.Where(u => u.Cosida && u.PagoModistaId == null).OrderByDescending(u => u.FechaCosida).ThenByDescending(u => u.Id).Take(yaCosidas - cosidas))
                {
                    u.Cosida = false;
                    u.FechaCosida = null;
                    u.PrecioCosido = null;
                }
            }

            await _context.SaveChangesAsync();
            return (true, null);
        }

        // El renglón guarda el producto por nombre; la tarifa está por ProductoId.
        private async Task<decimal?> TarifaAsync(int modistaId, string producto)
        {
            var nombre = (producto ?? string.Empty).Trim().ToLower();

            return await _context.TarifasModista
                .Where(t => t.ModistaId == modistaId && t.Producto!.Nombre.Trim().ToLower() == nombre)
                .Select(t => (decimal?)t.Precio)
                .FirstOrDefaultAsync();
        }
    }
}
