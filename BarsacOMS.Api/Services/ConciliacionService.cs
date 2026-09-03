using BarsacOMS.Api.Data;
using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BarsacOMS.Api.Services
{
    public class ConciliacionService : IConciliacionService
    {
        private static readonly string[] Cuentas = { "EFECTIVO", "MERCADO PAGO", "UALA", "ICBC" };

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

            var cobros = await _context.Cobros
                .Where(c => c.MedioCobro == cuenta && c.FechaCobro >= saldoInicial.Fecha)
                .Select(c => new MovimientoCuentaDto
                {
                    Fecha = c.FechaCobro,
                    Concepto = c.Concepto,
                    Ingreso = c.Importe,
                    Egreso = 0,
                    Origen = "Cobro"
                })
                .ToListAsync();

            var pagos = await _context.Pagos
                .Where(p => p.MedioPago == cuenta && p.Estado == EstadoPago.PAGADO)
                .ToListAsync();

            var pagosDto = pagos
                .Select(p => new { Fecha = p.FechaPago ?? p.FechaFactura, p.Concepto, p.Importe })
                .Where(p => p.Fecha >= saldoInicial.Fecha)
                .Select(p => new MovimientoCuentaDto
                {
                    Fecha = p.Fecha,
                    Concepto = p.Concepto,
                    Ingreso = 0,
                    Egreso = p.Importe,
                    Origen = "Pago"
                })
                .ToList();

            var manuales = await _context.MovimientosManualesCuenta
                .Where(m => m.Cuenta == cuenta && m.Fecha >= saldoInicial.Fecha)
                .Select(m => new MovimientoCuentaDto
                {
                    Fecha = m.Fecha,
                    Concepto = m.Concepto,
                    Ingreso = m.EsIngreso ? m.Monto : 0,
                    Egreso = m.EsIngreso ? 0 : m.Monto,
                    Origen = "Manual",
                    MovimientoManualId = m.Id
                })
                .ToListAsync();

            var movimientos = cobros
                .Concat(pagosDto)
                .Concat(manuales)
                .OrderBy(m => m.Fecha)
                .ToList();

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

            _context.MovimientosManualesCuenta.Remove(existente);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
