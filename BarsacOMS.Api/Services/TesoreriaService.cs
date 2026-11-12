using BarsacOMS.Api.Data;
using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BarsacOMS.Api.Services
{
    // Tesorería: conciliar cada cuenta contra el extracto del banco. Los movimientos de Barsac
    // son los mismos de Conciliación (cobros, pagos PAGADOS y movimientos manuales de la cuenta).
    public class TesoreriaService : ITesoreriaService
    {
        private readonly AppDbContext _context;
        private readonly IConciliacionService _conciliacion;

        // Para conciliar solo: mismo importe y a lo sumo estos días de diferencia
        private const int DiasToleranciaAutomatica = 5;

        public TesoreriaService(AppDbContext context, IConciliacionService conciliacion)
        {
            _context = context;
            _conciliacion = conciliacion;
        }

        public bool CuentaValida(string cuenta) => _conciliacion.ObtenerCuentas().Contains(cuenta);

        // ===================== RESUMEN (tarjetas) =====================

        public async Task<List<ResumenTesoreriaDto>> ObtenerResumenAsync()
        {
            var resumen = new List<ResumenTesoreriaDto>();
            foreach (var cuenta in _conciliacion.ObtenerCuentas())
            {
                resumen.Add(await ResumenCuentaAsync(cuenta));
            }
            return resumen;
        }

        private async Task<ResumenTesoreriaDto> ResumenCuentaAsync(string cuenta)
        {
            var libro = await _conciliacion.ObtenerLibroAsync(cuenta);
            var dto = new ResumenTesoreriaDto
            {
                Cuenta = cuenta,
                SaldoBarsac = libro.Count > 0 ? libro[^1].Saldo : 0
            };

            var extracto = await _context.ExtractoMovimientos.AsNoTracking()
                .Where(e => e.Cuenta == cuenta)
                .OrderBy(e => e.Fecha).ThenBy(e => e.Id)
                .ToListAsync();
            dto.MovimientosExtracto = extracto.Count;

            var (barsac, revisar) = await MovimientosBarsacAsync(cuenta, DateTime.MinValue, DateTime.MaxValue);
            dto.ARevisar = revisar.Count;
            if (extracto.Count == 0) return dto;

            dto.PrimerExtracto = extracto[0].Fecha.Date;
            dto.UltimoExtracto = extracto[^1].Fecha.Date;

            var pendientesBanco = extracto.Where(e => e.ConciliacionBancoId == null).ToList();
            dto.PendientesBanco = pendientesBanco.Count;
            dto.ImportePendienteBanco = pendientesBanco.Sum(e => e.Importe);

            // Lo de Barsac cuenta como pendiente solo dentro del período que cubren los extractos
            // (lo anterior o posterior todavía no se puede comparar contra nada)
            var finPeriodo = dto.UltimoExtracto.Value.AddDays(1);
            var pendientesBarsac = barsac
                .Where(m => m.ConciliacionId == null && m.Fecha >= dto.PrimerExtracto && m.Fecha < finPeriodo)
                .ToList();
            dto.PendientesBarsac = pendientesBarsac.Count;
            dto.ImportePendienteBarsac = pendientesBarsac.Sum(m => m.Importe);

            // Saldo del banco: el último que informó el extracto
            var conSaldo = extracto.LastOrDefault(e => e.SaldoBanco != null);
            if (conSaldo != null)
            {
                dto.SaldoBanco = conSaldo.SaldoBanco;
                dto.FechaSaldoBanco = conSaldo.Fecha.Date;

                var hasta = conSaldo.Fecha.Date.AddDays(1);
                var ultimoBarsac = libro.LastOrDefault(m => m.Fecha < hasta);
                if (ultimoBarsac != null)
                {
                    dto.SaldoBarsacAlaFecha = ultimoBarsac.Saldo;
                    dto.Diferencia = ultimoBarsac.Saldo - conSaldo.SaldoBanco.Value;
                }
            }

            return dto;
        }

        // ===================== MOVIMIENTOS (tabla principal) =====================

        public async Task<List<MovimientoTesoreriaDto>> ObtenerMovimientosAsync(string cuenta, DateTime? desde, DateTime? hasta)
        {
            var inicio = desde?.Date ?? DateTime.MinValue;
            var fin = hasta?.Date.AddDays(1) ?? DateTime.MaxValue;

            var libro = await _conciliacion.ObtenerLibroAsync(cuenta);
            var conciliados = await ConciliadosAsync();

            return libro
                .Where(m => m.Fecha >= inicio && m.Fecha < fin)
                .Select(m => new MovimientoTesoreriaDto
                {
                    Fecha = m.Fecha,
                    Origen = m.Origen,
                    OrigenId = m.OrigenId,
                    Concepto = m.Concepto,
                    Detalle = m.Detalle,
                    Ingreso = m.Ingreso,
                    Egreso = m.Egreso,
                    Saldo = m.Saldo,
                    Conciliado = m.Origen != "SaldoInicial" && conciliados.ContainsKey((m.Origen, m.OrigenId))
                })
                .ToList();
        }

        // Últimos 12 meses: lo que entró, lo que salió y el saldo a fin de cada mes
        public async Task<GraficoTesoreriaDto> ObtenerGraficoAsync(string cuenta)
        {
            var hoy = DateTime.Today;
            var primerMes = new DateTime(hoy.Year, hoy.Month, 1).AddMonths(-11);
            var nombres = new[] { "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic" };

            var movimientos = await _conciliacion.ObtenerMovimientosAsync(cuenta, primerMes, primerMes.AddMonths(12));
            var libro = await _conciliacion.ObtenerLibroAsync(cuenta);

            var dto = new GraficoTesoreriaDto();
            for (int i = 0; i < 12; i++)
            {
                var mes = primerMes.AddMonths(i);
                var finMes = mes.AddMonths(1);
                var delMes = movimientos.Where(m => m.Fecha >= mes && m.Fecha < finMes).ToList();

                dto.Meses.Add($"{nombres[mes.Month - 1]} {mes:yy}");
                dto.Ingresos.Add(delMes.Sum(m => m.Ingreso));
                dto.Egresos.Add(delMes.Sum(m => m.Egreso));

                // Antes del Saldo Inicial no hay saldo para mostrar
                var ultimo = libro.LastOrDefault(m => m.Fecha < finMes);
                dto.Saldo.Add(ultimo?.Saldo);
            }
            return dto;
        }

        // ===================== PANTALLA DE CONCILIAR =====================

        public async Task<PantallaConciliarDto> ObtenerPantallaConciliarAsync(string cuenta, DateTime? desde, DateTime? hasta)
        {
            var inicio = desde?.Date ?? DateTime.MinValue;
            var fin = hasta?.Date.AddDays(1) ?? DateTime.MaxValue;

            var banco = await _context.ExtractoMovimientos.AsNoTracking()
                .Where(e => e.Cuenta == cuenta && e.Fecha >= inicio && e.Fecha < fin)
                .OrderBy(e => e.Fecha).ThenBy(e => e.Id)
                .Select(e => new ExtractoDto
                {
                    Id = e.Id,
                    Fecha = e.Fecha,
                    Descripcion = e.Descripcion,
                    Importe = e.Importe,
                    SaldoBanco = e.SaldoBanco,
                    Origen = e.Origen,
                    FechaCarga = e.FechaCarga,
                    ConciliacionId = e.ConciliacionBancoId
                })
                .ToListAsync();

            var (barsac, revisar) = await MovimientosBarsacAsync(cuenta, inicio, fin);

            return new PantallaConciliarDto { Banco = banco, Barsac = barsac, ARevisar = revisar };
        }

        // Movimientos de Barsac de la cuenta (con su conciliación, si tienen) y las
        // conciliaciones de la cuenta que ya no cuadran.
        private async Task<(List<MovimientoBarsacDto> Movimientos, List<ConciliacionARevisarDto> ARevisar)> MovimientosBarsacAsync(string cuenta, DateTime desde, DateTime hasta)
        {
            var todos = await _conciliacion.ObtenerMovimientosAsync(cuenta, DateTime.MinValue, DateTime.MaxValue);
            var conciliados = await ConciliadosAsync();

            var movimientos = todos
                .Where(m => m.Fecha >= desde && m.Fecha < hasta)
                .Select(m => new MovimientoBarsacDto
                {
                    Origen = m.Origen,
                    OrigenId = m.OrigenId,
                    Fecha = m.Fecha,
                    Concepto = m.Concepto,
                    Detalle = m.Detalle,
                    Importe = m.Ingreso - m.Egreso,
                    ConciliacionId = conciliados.TryGetValue((m.Origen, m.OrigenId), out var c) ? c : null
                })
                .ToList();

            // Conciliaciones de esta cuenta que dejaron de cuadrar
            var actuales = todos.ToDictionary(m => (m.Origen, m.OrigenId), m => m.Ingreso - m.Egreso);
            var conciliaciones = await _context.ConciliacionesBanco.AsNoTracking()
                .Include(c => c.MovimientosBarsac)
                .Where(c => c.Cuenta == cuenta)
                .ToListAsync();
            var bancoPorConciliacion = (await _context.ExtractoMovimientos.AsNoTracking()
                    .Where(e => e.Cuenta == cuenta && e.ConciliacionBancoId != null)
                    .Select(e => new { Id = e.ConciliacionBancoId!.Value, e.Importe })
                    .ToListAsync())
                .GroupBy(x => x.Id)
                .ToDictionary(g => g.Key, g => g.Sum(x => x.Importe));

            var revisar = new List<ConciliacionARevisarDto>();
            foreach (var c in conciliaciones)
            {
                string? motivo = null;
                foreach (var item in c.MovimientosBarsac)
                {
                    if (!actuales.TryGetValue((item.Origen, item.OrigenId), out var importe))
                    {
                        motivo = $"El {item.Origen.ToLower()} #{item.OrigenId} ya no está en esta cuenta (se borró o se le cambió el medio de pago).";
                        break;
                    }
                    if (Math.Round(importe, 2) != Math.Round(item.Importe, 2))
                    {
                        motivo = $"Al {item.Origen.ToLower()} #{item.OrigenId} le cambiaron el importe después de conciliarlo.";
                        break;
                    }
                }
                var sumaBanco = bancoPorConciliacion.GetValueOrDefault(c.Id);
                if (motivo == null && Math.Round(sumaBanco, 2) != Math.Round(c.MovimientosBarsac.Sum(i => i.Importe), 2))
                    motivo = "Lo del banco y lo de Barsac ya no suman lo mismo.";

                if (motivo != null) revisar.Add(new ConciliacionARevisarDto { Id = c.Id, Fecha = c.Fecha, Motivo = motivo });
            }

            return (movimientos, revisar);
        }

        private async Task<Dictionary<(string, int), int>> ConciliadosAsync()
        {
            var items = await _context.ConciliacionesBarsac.AsNoTracking()
                .Select(i => new { i.Origen, i.OrigenId, i.ConciliacionBancoId })
                .ToListAsync();
            return items
                .GroupBy(i => (i.Origen, i.OrigenId))
                .ToDictionary(g => g.Key, g => g.First().ConciliacionBancoId);
        }

        // ===================== EXTRACTOS =====================

        public async Task<(ResultadoCargaExtractoDto? Resultado, string? Error)> CargarExtractoAsync(string cuenta, CargarExtractoDto dto)
        {
            var renglones = dto.Movimientos ?? new List<RenglonExtractoDto>();
            if (renglones.Count == 0) return (null, "No hay movimientos para cargar.");
            if (renglones.Any(r => r.Importe == 0)) return (null, "Hay renglones con importe 0. Revisalos antes de cargar.");
            if (renglones.Any(r => r.Fecha.Year < 2000 || r.Fecha.Year > 2100)) return (null, "Hay renglones sin fecha válida. Revisalos antes de cargar.");

            // Si se vuelve a subir el mismo extracto (o uno que se pisa con otro ya cargado), los
            // renglones que ya están no se duplican. Se cuenta cuántas veces aparece cada uno, así
            // dos movimientos iguales el mismo día (ej. dos transferencias de $10.000) sí entran.
            static string Clave(DateTime f, decimal i, string d) => $"{f:yyyyMMdd}|{Math.Round(i, 2)}|{(d ?? "").Trim().ToLower()}";

            var fechas = renglones.Select(r => r.Fecha.Date).Distinct().ToList();
            var desde = fechas.Min();
            var hasta = fechas.Max().AddDays(1);
            var existentes = (await _context.ExtractoMovimientos.AsNoTracking()
                    .Where(e => e.Cuenta == cuenta && e.Fecha >= desde && e.Fecha < hasta)
                    .Select(e => new { e.Fecha, e.Importe, e.Descripcion })
                    .ToListAsync())
                .GroupBy(e => Clave(e.Fecha, e.Importe, e.Descripcion))
                .ToDictionary(g => g.Key, g => g.Count());

            var origen = string.IsNullOrWhiteSpace(dto.Origen) ? "Carga" : dto.Origen.Trim();
            if (origen.Length > 200) origen = origen[..200];
            var ahora = DateTime.UtcNow;
            var resultado = new ResultadoCargaExtractoDto();

            foreach (var r in renglones)
            {
                var clave = Clave(r.Fecha, r.Importe, r.Descripcion);
                if (existentes.TryGetValue(clave, out var quedan) && quedan > 0)
                {
                    existentes[clave] = quedan - 1;
                    resultado.Repetidos++;
                    continue;
                }

                var descripcion = (r.Descripcion ?? "").Trim();
                if (descripcion.Length > 500) descripcion = descripcion[..500];

                _context.ExtractoMovimientos.Add(new ExtractoMovimiento
                {
                    Cuenta = cuenta,
                    Fecha = r.Fecha.Date,
                    Descripcion = descripcion,
                    Importe = Math.Round(r.Importe, 2),
                    SaldoBanco = r.SaldoBanco.HasValue ? Math.Round(r.SaldoBanco.Value, 2) : null,
                    Origen = origen,
                    FechaCarga = ahora
                });
                resultado.Cargados++;
            }

            await _context.SaveChangesAsync();
            return (resultado, null);
        }

        public async Task<(int Eliminados, string? Error)> EliminarExtractoAsync(string cuenta, List<int> ids)
        {
            var renglones = await _context.ExtractoMovimientos.Where(e => e.Cuenta == cuenta && ids.Contains(e.Id)).ToListAsync();
            if (renglones.Any(e => e.ConciliacionBancoId != null))
                return (0, "Hay renglones ya conciliados. Primero deshacé su conciliación.");

            _context.ExtractoMovimientos.RemoveRange(renglones);
            await _context.SaveChangesAsync();
            return (renglones.Count, null);
        }

        // ===================== CONCILIAR =====================

        public async Task<(int? ConciliacionId, string? Error)> ConciliarAsync(string cuenta, ConciliarDto dto, int? usuarioId)
        {
            var extractoIds = (dto.ExtractoIds ?? new()).Distinct().ToList();
            var refs = (dto.Barsac ?? new()).GroupBy(r => (r.Origen, r.OrigenId)).Select(g => g.First()).ToList();

            if (extractoIds.Count == 0 || refs.Count == 0)
                return (null, "Elegí al menos un movimiento del banco y uno de Barsac.");

            var banco = await _context.ExtractoMovimientos.Where(e => e.Cuenta == cuenta && extractoIds.Contains(e.Id)).ToListAsync();
            if (banco.Count != extractoIds.Count) return (null, "Algún movimiento del banco no existe o es de otra cuenta. Recargá la pantalla.");
            if (banco.Any(e => e.ConciliacionBancoId != null)) return (null, "Algún movimiento del banco ya está conciliado. Recargá la pantalla.");

            var movimientos = (await _conciliacion.ObtenerMovimientosAsync(cuenta, DateTime.MinValue, DateTime.MaxValue))
                .ToDictionary(m => (m.Origen, m.OrigenId), m => m.Ingreso - m.Egreso);
            var conciliados = await ConciliadosAsync();

            var items = new List<ConciliacionBarsac>();
            foreach (var r in refs)
            {
                if (!movimientos.TryGetValue((r.Origen, r.OrigenId), out var importe))
                    return (null, $"El {r.Origen.ToLower()} #{r.OrigenId} no es de esta cuenta. Recargá la pantalla.");
                if (conciliados.ContainsKey((r.Origen, r.OrigenId)))
                    return (null, $"El {r.Origen.ToLower()} #{r.OrigenId} ya está conciliado. Recargá la pantalla.");
                items.Add(new ConciliacionBarsac { Origen = r.Origen, OrigenId = r.OrigenId, Importe = importe });
            }

            var sumaBanco = Math.Round(banco.Sum(e => e.Importe), 2);
            var sumaBarsac = Math.Round(items.Sum(i => i.Importe), 2);
            if (sumaBanco != sumaBarsac)
                return (null, $"No coinciden: el banco suma {ControlBorrados.Moneda(sumaBanco)} y Barsac {ControlBorrados.Moneda(sumaBarsac)}.");

            var conciliacion = new ConciliacionBanco
            {
                Cuenta = cuenta,
                Fecha = DateTime.UtcNow,
                UsuarioId = usuarioId,
                MovimientosBarsac = items
            };
            _context.ConciliacionesBanco.Add(conciliacion);
            await _context.SaveChangesAsync();

            banco.ForEach(e => e.ConciliacionBancoId = conciliacion.Id);
            await _context.SaveChangesAsync();
            return (conciliacion.Id, null);
        }

        // Empareja solo lo obvio: un renglón del banco con un movimiento de Barsac del mismo
        // importe, a pocos días. Si hay dudas (dos candidatos igual de cerca) lo deja para tildar a mano.
        public async Task<int> ConciliarAutomaticoAsync(string cuenta, int? usuarioId)
        {
            var banco = await _context.ExtractoMovimientos
                .Where(e => e.Cuenta == cuenta && e.ConciliacionBancoId == null)
                .OrderBy(e => e.Fecha).ThenBy(e => e.Id)
                .ToListAsync();
            if (banco.Count == 0) return 0;

            var desde = banco.Min(e => e.Fecha).AddDays(-DiasToleranciaAutomatica);
            var hasta = banco.Max(e => e.Fecha).AddDays(DiasToleranciaAutomatica + 1);
            var (barsac, _) = await MovimientosBarsacAsync(cuenta, desde, hasta);
            var libres = barsac.Where(m => m.ConciliacionId == null).ToList();

            var usados = new HashSet<(string, int)>();
            int cantidad = 0;

            foreach (var e in banco)
            {
                var candidatos = libres
                    .Where(m => !usados.Contains((m.Origen, m.OrigenId))
                                && Math.Round(m.Importe, 2) == Math.Round(e.Importe, 2)
                                && Math.Abs((m.Fecha.Date - e.Fecha.Date).TotalDays) <= DiasToleranciaAutomatica)
                    .Select(m => new { M = m, Dias = Math.Abs((m.Fecha.Date - e.Fecha.Date).TotalDays) })
                    .OrderBy(x => x.Dias)
                    .ToList();
                if (candidatos.Count == 0) continue;
                if (candidatos.Count > 1 && candidatos[0].Dias == candidatos[1].Dias) continue; // empate: a mano

                var elegido = candidatos[0].M;
                usados.Add((elegido.Origen, elegido.OrigenId));

                var conciliacion = new ConciliacionBanco
                {
                    Cuenta = cuenta,
                    Fecha = DateTime.UtcNow,
                    UsuarioId = usuarioId,
                    Automatica = true,
                    MovimientosBarsac = new List<ConciliacionBarsac>
                    {
                        new() { Origen = elegido.Origen, OrigenId = elegido.OrigenId, Importe = elegido.Importe }
                    }
                };
                _context.ConciliacionesBanco.Add(conciliacion);
                await _context.SaveChangesAsync();
                e.ConciliacionBancoId = conciliacion.Id;
                cantidad++;
            }

            await _context.SaveChangesAsync();
            return cantidad;
        }

        public async Task<bool> DeshacerConciliacionAsync(int conciliacionId)
        {
            var conciliacion = await _context.ConciliacionesBanco.FindAsync(conciliacionId);
            if (conciliacion == null) return false;
            await QuitarConciliacionAsync(_context, conciliacion);
            await _context.SaveChangesAsync();
            return true;
        }

        // Un gasto del banco que no está en Barsac (comisión, impuesto, intereses...): se crea
        // el movimiento manual en la cuenta con los mismos datos y queda conciliado.
        public async Task<string?> CrearMovimientoDesdeExtractoAsync(string cuenta, int extractoId, string? concepto, int? usuarioId)
        {
            var e = await _context.ExtractoMovimientos.FirstOrDefaultAsync(x => x.Id == extractoId && x.Cuenta == cuenta);
            if (e == null) return "No se encontró ese movimiento del banco.";
            if (e.ConciliacionBancoId != null) return "Ese movimiento del banco ya está conciliado.";

            var texto = string.IsNullOrWhiteSpace(concepto) ? e.Descripcion : concepto.Trim();
            if (string.IsNullOrWhiteSpace(texto)) texto = "Movimiento del banco";

            var manual = new MovimientoManualCuenta
            {
                Cuenta = cuenta,
                Fecha = e.Fecha,
                Concepto = texto,
                Monto = Math.Abs(e.Importe),
                EsIngreso = e.Importe > 0
            };
            _context.MovimientosManualesCuenta.Add(manual);
            await _context.SaveChangesAsync();

            var conciliacion = new ConciliacionBanco
            {
                Cuenta = cuenta,
                Fecha = DateTime.UtcNow,
                UsuarioId = usuarioId,
                MovimientosBarsac = new List<ConciliacionBarsac>
                {
                    new() { Origen = "Manual", OrigenId = manual.Id, Importe = e.Importe }
                }
            };
            _context.ConciliacionesBanco.Add(conciliacion);
            await _context.SaveChangesAsync();
            e.ConciliacionBancoId = conciliacion.Id;
            await _context.SaveChangesAsync();
            return null;
        }

        // ===================== Para las otras pantallas =====================

        // Si se borra un cobro/pago/movimiento conciliado (o se le cambia el importe o la
        // cuenta), su conciliación se deshace: los renglones del banco vuelven a quedar
        // pendientes en Tesorería en vez de quedar tildados contra algo que ya no existe.
        // No guarda: lo hace quien llama, junto con su propio cambio.
        public static async Task DesconciliarAsync(AppDbContext context, string origen, int origenId)
        {
            var item = await context.ConciliacionesBarsac.FirstOrDefaultAsync(i => i.Origen == origen && i.OrigenId == origenId);
            if (item == null) return;

            var conciliacion = await context.ConciliacionesBanco.FindAsync(item.ConciliacionBancoId);
            if (conciliacion != null) await QuitarConciliacionAsync(context, conciliacion);
        }

        private static async Task QuitarConciliacionAsync(AppDbContext context, ConciliacionBanco conciliacion)
        {
            var banco = await context.ExtractoMovimientos.Where(e => e.ConciliacionBancoId == conciliacion.Id).ToListAsync();
            banco.ForEach(e => e.ConciliacionBancoId = null);

            var items = await context.ConciliacionesBarsac.Where(i => i.ConciliacionBancoId == conciliacion.Id).ToListAsync();
            context.ConciliacionesBarsac.RemoveRange(items);
            context.ConciliacionesBanco.Remove(conciliacion);
        }
    }
}
