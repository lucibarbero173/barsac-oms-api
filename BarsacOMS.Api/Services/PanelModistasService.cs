using BarsacOMS.Api.Data;
using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BarsacOMS.Api.Services
{
    // Panel general de modistas: cuánto se les da, cuánto cosen, qué les falta y cuánto se les debe.
    // También la liquidación (registrar / anular pagos).
    public class PanelModistasService : IPanelModistasService
    {
        // Las fechas se guardan en UTC; los días y semanas se cuentan en hora de Argentina.
        private static readonly TimeSpan OffsetArgentina = TimeSpan.FromHours(-3);

        private readonly AppDbContext _context;

        public PanelModistasService(AppDbContext context)
        {
            _context = context;
        }

        private static DateTime ALocal(DateTime utc) => utc + OffsetArgentina;
        private static DateTime AUtc(DateTime local) => local - OffsetArgentina;

        private static DateTime LunesDe(DateTime fecha)
        {
            var dias = ((int)fecha.DayOfWeek + 6) % 7; // lunes = 0
            return fecha.Date.AddDays(-dias);
        }

        public async Task<PanelModistasDto> ObtenerPanelAsync(DateTime? desde, DateTime? hasta)
        {
            // Por defecto: las últimas 8 semanas (desde el lunes de hace 7 semanas hasta hoy)
            var hoy = ALocal(DateTime.UtcNow).Date;
            var hastaLocal = (hasta ?? hoy).Date;
            var desdeLocal = (desde ?? LunesDe(hoy).AddDays(-7 * 7)).Date;
            if (desdeLocal > hastaLocal) (desdeLocal, hastaLocal) = (hastaLocal, desdeLocal);

            var desdeUtc = AUtc(desdeLocal);
            var hastaUtc = AUtc(hastaLocal.AddDays(1)); // exclusivo: incluye todo el día "hasta"

            var modistas = await _context.Modistas.AsNoTracking().OrderBy(m => m.Nombre).ToListAsync();

            var unidades = await _context.PrendasUnidad
                .AsNoTracking()
                .Where(u => u.ModistaId != null)
                .Select(u => new
                {
                    ModistaId = u.ModistaId!.Value,
                    u.Cosida,
                    u.FechaCosida,
                    u.PrecioCosido,
                    u.PagoModistaId,
                    u.FechaAsignacionModista
                })
                .ToListAsync();

            var ultimosPagos = await _context.PagosModista
                .AsNoTracking()
                .GroupBy(p => p.ModistaId)
                .Select(g => new { ModistaId = g.Key, Fecha = g.Max(p => p.Fecha) })
                .ToDictionaryAsync(x => x.ModistaId, x => x.Fecha);

            var porModista = unidades.ToLookup(u => u.ModistaId);

            var resumen = modistas
                .Select(m =>
                {
                    var us = porModista[m.Id].ToList();
                    var sinPagar = us.Where(u => u.Cosida && u.PagoModistaId == null).ToList();

                    return new ResumenModistaPanelDto
                    {
                        ModistaId = m.Id,
                        Nombre = m.Nombre,
                        Activa = m.Activa,
                        FaltaCoser = us.Count(u => !u.Cosida),
                        APagar = sinPagar.Sum(u => u.PrecioCosido ?? 0),
                        PrendasAPagar = sinPagar.Count(u => u.PrecioCosido != null),
                        SinTarifa = sinPagar.Count(u => u.PrecioCosido == null),
                        AsignadasPeriodo = us.Count(u => u.FechaAsignacionModista >= desdeUtc && u.FechaAsignacionModista < hastaUtc),
                        CosidasPeriodo = us.Count(u => u.Cosida && u.FechaCosida >= desdeUtc && u.FechaCosida < hastaUtc),
                        UltimaCosida = us.Max(u => u.FechaCosida) is DateTime uc ? ALocal(uc) : null,
                        UltimoPago = ultimosPagos.TryGetValue(m.Id, out var f) ? ALocal(f) : null
                    };
                })
                // Las inactivas sin nada pendiente no aportan nada al panel
                .Where(r => r.Activa || r.FaltaCoser > 0 || r.PrendasAPagar > 0 || r.SinTarifa > 0 || r.CosidasPeriodo > 0)
                .ToList();

            // Semanas del período, de lunes a domingo
            var semanas = new List<DateTime>();
            for (var s = LunesDe(desdeLocal); s <= hastaLocal; s = s.AddDays(7)) semanas.Add(s);

            var series = resumen
                .Where(r => r.CosidasPeriodo > 0)
                .Select(r => new SerieModistaDto
                {
                    ModistaId = r.ModistaId,
                    Nombre = r.Nombre,
                    Valores = semanas.Select(s => porModista[r.ModistaId].Count(u =>
                        u.Cosida && u.FechaCosida >= desdeUtc && u.FechaCosida < hastaUtc
                        && LunesDe(ALocal(u.FechaCosida!.Value)) == s)).ToList()
                })
                .ToList();

            return new PanelModistasDto
            {
                Desde = desdeLocal,
                Hasta = hastaLocal,
                FaltaCoser = resumen.Sum(r => r.FaltaCoser),
                AsignadasPeriodo = resumen.Sum(r => r.AsignadasPeriodo),
                CosidasPeriodo = resumen.Sum(r => r.CosidasPeriodo),
                APagar = resumen.Sum(r => r.APagar),
                PrendasAPagar = resumen.Sum(r => r.PrendasAPagar),
                SinTarifa = resumen.Sum(r => r.SinTarifa),
                Modistas = resumen,
                Semanas = semanas,
                Series = series
            };
        }

        public async Task<DetalleModistaPanelDto?> ObtenerDetalleAsync(int modistaId)
        {
            var modista = await _context.Modistas.AsNoTracking().FirstOrDefaultAsync(m => m.Id == modistaId);
            if (modista == null) return null;

            var renglones = await (
                from d in _context.DetallesFichaProduccion
                join f in _context.FichasProduccion on d.FichaProduccionId equals f.Id
                where d.Unidades.Any(u => u.ModistaId == modistaId && !u.Cosida)
                select new PendienteCoserDto
                {
                    FichaId = f.Id,
                    OrdenId = f.OrdenId,
                    Cliente = f.Orden.NombreCliente,
                    FechaEntrega = f.Orden.FechaEntrega,
                    Producto = d.Producto,
                    Talle = d.Talle,
                    Numero = d.Numero,
                    Nombre = d.Nombre,
                    Asignadas = d.Unidades.Count(u => u.ModistaId == modistaId),
                    Cosidas = d.Unidades.Count(u => u.ModistaId == modistaId && u.Cosida)
                }).AsNoTracking().ToListAsync();

            var aPagar = await (
                from u in _context.PrendasUnidad
                join d in _context.DetallesFichaProduccion on u.DetalleFichaProduccionId equals d.Id
                where u.ModistaId == modistaId && u.Cosida && u.PagoModistaId == null
                group u by new { d.Producto, u.PrecioCosido } into g
                select new LineaAPagarDto
                {
                    Producto = g.Key.Producto,
                    Precio = g.Key.PrecioCosido,
                    Cantidad = g.Count(),
                    Subtotal = (g.Key.PrecioCosido ?? 0) * g.Count()
                }).ToListAsync();

            var pagos = await _context.PagosModista
                .AsNoTracking()
                .Where(p => p.ModistaId == modistaId)
                .OrderByDescending(p => p.Fecha)
                .ToListAsync();

            return new DetalleModistaPanelDto
            {
                ModistaId = modista.Id,
                Nombre = modista.Nombre,
                Pendientes = renglones.OrderBy(r => r.FechaEntrega ?? DateTime.MaxValue).ThenBy(r => r.FichaId).ToList(),
                APagar = aPagar.OrderBy(l => l.Precio == null).ThenBy(l => l.Producto).ToList(),
                Pagos = pagos.Select(p => new PagoModistaDto
                {
                    Id = p.Id,
                    Fecha = ALocal(p.Fecha),
                    Importe = p.Importe,
                    CantidadPrendas = p.CantidadPrendas,
                    Nota = p.Nota
                }).ToList()
            };
        }

        // Liquida TODO lo cosido y no pagado. Las prendas que se cosieron sin tarifa toman la
        // tarifa vigente hoy; si sigue sin haber tarifa quedan afuera (y se avisa).
        public async Task<(ResultadoPagoModistaDto? Resultado, string? Error)> RegistrarPagoAsync(int modistaId, string? nota)
        {
            if (!await _context.Modistas.AnyAsync(m => m.Id == modistaId)) return (null, "Modista no encontrada.");

            var pendientes = await (
                from u in _context.PrendasUnidad
                join d in _context.DetallesFichaProduccion on u.DetalleFichaProduccionId equals d.Id
                where u.ModistaId == modistaId && u.Cosida && u.PagoModistaId == null
                select new { Unidad = u, d.Producto }
            ).ToListAsync();

            var tarifas = await _context.TarifasModista
                .Where(t => t.ModistaId == modistaId)
                .Select(t => new { Nombre = t.Producto!.Nombre, t.Precio })
                .ToListAsync();
            var tarifaPorProducto = tarifas
                .GroupBy(t => t.Nombre.Trim().ToLower())
                .ToDictionary(g => g.Key, g => g.First().Precio);

            foreach (var p in pendientes.Where(p => p.Unidad.PrecioCosido == null))
            {
                if (tarifaPorProducto.TryGetValue((p.Producto ?? string.Empty).Trim().ToLower(), out var precio))
                    p.Unidad.PrecioCosido = precio;
            }

            var aPagar = pendientes.Where(p => p.Unidad.PrecioCosido != null).Select(p => p.Unidad).ToList();
            var sinTarifa = pendientes.Count - aPagar.Count;

            if (aPagar.Count == 0)
            {
                return (null, sinTarifa > 0
                    ? $"Hay {sinTarifa} prenda(s) cosidas sin tarifa cargada. Cargá la tarifa en Modistas y volvé a intentar."
                    : "No hay prendas cosidas pendientes de pago.");
            }

            var pago = new PagoModista
            {
                ModistaId = modistaId,
                Fecha = DateTime.UtcNow,
                Importe = aPagar.Sum(u => u.PrecioCosido!.Value),
                CantidadPrendas = aPagar.Count,
                Nota = string.IsNullOrWhiteSpace(nota) ? null : nota.Trim()
            };

            await using var transaccion = await _context.Database.BeginTransactionAsync();

            _context.PagosModista.Add(pago);
            await _context.SaveChangesAsync();

            aPagar.ForEach(u => u.PagoModistaId = pago.Id);
            await _context.SaveChangesAsync();

            await transaccion.CommitAsync();

            return (new ResultadoPagoModistaDto
            {
                Importe = pago.Importe,
                CantidadPrendas = pago.CantidadPrendas,
                SinTarifa = sinTarifa
            }, null);
        }

        // Por si se registró un pago por error: sus prendas vuelven a quedar a pagar.
        public async Task<bool> AnularPagoAsync(int pagoId)
        {
            var pago = await _context.PagosModista.FindAsync(pagoId);
            if (pago == null) return false;

            var unidades = await _context.PrendasUnidad.Where(u => u.PagoModistaId == pagoId).ToListAsync();
            unidades.ForEach(u => u.PagoModistaId = null);

            _context.PagosModista.Remove(pago);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
