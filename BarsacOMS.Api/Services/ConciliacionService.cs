using BarsacOMS.Api.Data;
using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BarsacOMS.Api.Services
{
    public class ConciliacionService : IConciliacionService
    {
        private static readonly string[] Cuentas = { "EFECTIVO", "MERCADO PAGO", "UALA", "ICBC", "CHEQUE" };

        private readonly AppDbContext _context;

        public ConciliacionService(AppDbContext context)
        {
            _context = context;
        }

        public IReadOnlyList<string> ObtenerCuentas() => Cuentas;

        public async Task<List<ResumenCuentaDto>> ObtenerResumenCuentasAsync()
        {
            var resumen = new List<ResumenCuentaDto>();
            foreach (var cuenta in Cuentas)
            {
                var libro = await ObtenerLibroAsync(cuenta);
                resumen.Add(new ResumenCuentaDto
                {
                    Cuenta = cuenta,
                    SaldoActual = libro.Count > 0 ? libro[^1].Saldo : 0
                });
            }
            return resumen;
        }

        public async Task<List<MovimientoCuentaDto>> ObtenerLibroAsync(string cuenta)
        {
            var saldoInicial = await ObtenerSaldoInicialAsync(cuenta);
            var movimientos = await ObtenerMovimientosAsync(cuenta, saldoInicial.Fecha, DateTime.MaxValue);

            var libro = new List<MovimientoCuentaDto>
            {
                new MovimientoCuentaDto
                {
                    Fecha = saldoInicial.Fecha,
                    Concepto = "Saldo Inicial",
                    Ingreso = 0,
                    Egreso = 0,
                    Saldo = saldoInicial.Monto,
                    Origen = "SaldoInicial"
                }
            };

            var saldoCorrido = saldoInicial.Monto;
            foreach (var mov in movimientos)
            {
                saldoCorrido += mov.Ingreso - mov.Egreso;
                mov.Saldo = saldoCorrido;
                libro.Add(mov);
            }

            return libro;
        }

        // Lo que entró y salió entre dos fechas (inclusive). Cuenta también lo anterior al Saldo
        // Inicial: el corte es para el saldo, pero la plata de esos días igual entró.
        public async Task<PeriodoCuentaDto> ObtenerPeriodoAsync(string cuenta, DateTime? desde, DateTime? hasta)
        {
            var inicio = desde?.Date ?? DateTime.MinValue;
            var fin = hasta?.Date.AddDays(1) ?? DateTime.MaxValue;

            var saldoInicial = await ObtenerSaldoInicialAsync(cuenta);
            var libro = await ObtenerLibroAsync(cuenta);

            var despuesDelCorte = libro
                .Where(m => m.Origen != "SaldoInicial" && m.Fecha >= inicio && m.Fecha < fin)
                .ToList();

            var finAntesDelCorte = fin < saldoInicial.Fecha ? fin : saldoInicial.Fecha;
            var antesDelCorte = await ObtenerMovimientosAsync(cuenta, inicio, finAntesDelCorte);
            antesDelCorte.ForEach(m => m.AntesDelCorte = true);

            var movimientos = antesDelCorte.Concat(despuesDelCorte).ToList();
            var ingresos = movimientos.Sum(m => m.Ingreso);
            var egresos = movimientos.Sum(m => m.Egreso);

            return new PeriodoCuentaDto
            {
                Ingresos = ingresos,
                Egresos = egresos,
                Neto = ingresos - egresos,
                Movimientos = movimientos
            };
        }

        // Cobros, pagos y movimientos manuales de la cuenta con fecha >= desde y < hasta
        public async Task<List<MovimientoCuentaDto>> ObtenerMovimientosAsync(string cuenta, DateTime desde, DateTime hasta)
        {
            var cobros = await _context.Cobros
                .Where(c => c.MedioCobro == cuenta && c.FechaCobro >= desde && c.FechaCobro < hasta)
                .Select(c => new MovimientoCuentaDto
                {
                    Fecha = c.FechaCobro,
                    Concepto = c.Concepto,
                    Ingreso = c.Importe,
                    Egreso = 0,
                    Origen = "Cobro",
                    OrigenId = c.Id,
                    Detalle = c.NombreCliente
                })
                .ToListAsync();

            var pagos = await _context.Pagos
                .Where(p => p.MedioPago == cuenta && p.Estado == EstadoPago.PAGADO)
                .ToListAsync();

            var pagosDto = pagos
                .Select(p => new { p.Id, Fecha = p.FechaPago ?? p.FechaFactura, p.Concepto, p.Importe, p.Proveedor })
                .Where(p => p.Fecha >= desde && p.Fecha < hasta)
                .Select(p => new MovimientoCuentaDto
                {
                    Fecha = p.Fecha,
                    Concepto = p.Concepto,
                    Ingreso = 0,
                    Egreso = p.Importe,
                    Origen = "Pago",
                    OrigenId = p.Id,
                    Detalle = p.Proveedor
                })
                .ToList();

            var manuales = await _context.MovimientosManualesCuenta
                .Where(m => m.Cuenta == cuenta && m.Fecha >= desde && m.Fecha < hasta)
                .Select(m => new MovimientoCuentaDto
                {
                    Fecha = m.Fecha,
                    Concepto = m.Concepto,
                    Ingreso = m.EsIngreso ? m.Monto : 0,
                    Egreso = m.EsIngreso ? 0 : m.Monto,
                    Origen = "Manual",
                    MovimientoManualId = m.Id,
                    OrigenId = m.Id
                })
                .ToListAsync();

            return cobros
                .Concat(pagosDto)
                .Concat(manuales)
                .OrderBy(m => m.Fecha)
                .ToList();
        }

        public async Task<SaldoInicialCuenta> ObtenerSaldoInicialAsync(string cuenta)
        {
            var saldo = await _context.SaldosInicialesCuenta.FirstOrDefaultAsync(s => s.Cuenta == cuenta);
            if (saldo == null)
            {
                saldo = new SaldoInicialCuenta { Cuenta = cuenta, Fecha = DateTime.MinValue, Monto = 0 };
            }
            return saldo;
        }

        public async Task<SaldoInicialCuenta> GuardarSaldoInicialAsync(string cuenta, GuardarSaldoInicialDto dto)
        {
            var saldo = await _context.SaldosInicialesCuenta.FirstOrDefaultAsync(s => s.Cuenta == cuenta);
            if (saldo == null)
            {
                saldo = new SaldoInicialCuenta { Cuenta = cuenta };
                _context.SaldosInicialesCuenta.Add(saldo);
            }

            saldo.Fecha = dto.Fecha;
            saldo.Monto = dto.Monto;

            await _context.SaveChangesAsync();
            return saldo;
        }

        public async Task<MovimientoManualCuenta> CrearMovimientoManualAsync(GuardarMovimientoManualDto dto)
        {
            var movimiento = new MovimientoManualCuenta
            {
                Cuenta = dto.Cuenta,
                Fecha = dto.Fecha,
                Concepto = dto.Concepto,
                Monto = dto.Monto,
                EsIngreso = dto.EsIngreso
            };

            _context.MovimientosManualesCuenta.Add(movimiento);
            await _context.SaveChangesAsync();
            return movimiento;
        }

        public async Task<bool> ActualizarMovimientoManualAsync(int id, GuardarMovimientoManualDto dto)
        {
            var existente = await _context.MovimientosManualesCuenta.FindAsync(id);
            if (existente == null) return false;

            // Conciliado en Tesorería con otro importe, sentido o cuenta: deja de valer
            if (Math.Round(dto.Monto, 2) != Math.Round(existente.Monto, 2) || dto.EsIngreso != existente.EsIngreso || dto.Cuenta != existente.Cuenta)
                await TesoreriaService.DesconciliarAsync(_context, "Manual", id);

            existente.Cuenta = dto.Cuenta;
            existente.Fecha = dto.Fecha;
            existente.Concepto = dto.Concepto;
            existente.Monto = dto.Monto;
            existente.EsIngreso = dto.EsIngreso;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> EliminarMovimientoManualAsync(int id)
        {
            var existente = await _context.MovimientosManualesCuenta.FindAsync(id);
            if (existente == null) return false;

            await TesoreriaService.DesconciliarAsync(_context, "Manual", id);
            _context.MovimientosManualesCuenta.Remove(existente);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
