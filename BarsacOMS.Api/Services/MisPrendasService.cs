using BarsacOMS.Api.Data;
using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Models;
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

            var fichaIds = fichas.Select(f => f.Id).ToList();
            var extras = (await _context.PrendasExtraModista
                .AsNoTracking()
                .Where(e => e.ModistaId == modistaId && fichaIds.Contains(e.FichaProduccionId))
                .OrderBy(e => e.FechaCarga)
                .ToListAsync())
                .ToLookup(e => e.FichaProduccionId);

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
                }).ToList(),
                Extras = extras[f.Id].Select(e => AExtraDto(e, f.OrdenId, f.Cliente)).ToList()
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

        public static PrendaExtraDto AExtraDto(PrendaExtraModista e, int ordenId, string cliente) => new PrendaExtraDto
        {
            Id = e.Id,
            FichaId = e.FichaProduccionId,
            OrdenId = ordenId,
            Cliente = cliente,
            Producto = e.Producto,
            Cantidad = e.Cantidad,
            Nota = e.Nota,
            FechaCarga = e.FechaCarga.AddHours(-3), // hora de Argentina
            Estado = (int)e.Estado,
            PrecioUnitario = e.PrecioUnitario,
            Pagada = e.PagoModistaId != null
        };

        // "Cosí de más": solo en fichas donde tiene prendas asignadas y con un producto de esa ficha.
        public async Task<(bool Exito, string? Error)> CargarExtraAsync(int modistaId, int fichaId, CargarPrendaExtraDto dto)
        {
            if (dto.Cantidad <= 0) return (false, "La cantidad tiene que ser mayor a cero.");
            if (dto.Cantidad > 500) return (false, "Revisá la cantidad, es demasiado alta.");

            var productosFicha = await _context.DetallesFichaProduccion
                .Where(d => d.FichaProduccionId == fichaId && d.Unidades.Any(u => u.ModistaId == modistaId))
                .Select(d => d.Producto)
                .Distinct()
                .ToListAsync();

            if (productosFicha.Count == 0) return (false, "Esa ficha no está asignada a vos.");

            var producto = productosFicha.FirstOrDefault(p => p == dto.Producto);
            if (producto == null) return (false, "Elegí un producto de la ficha.");

            _context.PrendasExtraModista.Add(new PrendaExtraModista
            {
                ModistaId = modistaId,
                FichaProduccionId = fichaId,
                Producto = producto,
                Cantidad = dto.Cantidad,
                Nota = string.IsNullOrWhiteSpace(dto.Nota) ? null : dto.Nota.Trim(),
                FechaCarga = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();
            return (true, null);
        }

        // Solo puede borrar las suyas que todavía no se revisaron
        public async Task<(bool Exito, string? Error)> BorrarExtraAsync(int modistaId, int extraId)
        {
            var extra = await _context.PrendasExtraModista.FirstOrDefaultAsync(e => e.Id == extraId && e.ModistaId == modistaId);
            if (extra == null) return (false, "No se encontró esa carga.");
            if (extra.Estado != EstadoPrendaExtra.Pendiente) return (false, "Ya fue revisada, no se puede borrar.");

            _context.PrendasExtraModista.Remove(extra);
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
