using Microsoft.EntityFrameworkCore;
using BarsacOMS.Api.Data;
using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Models;

namespace BarsacOMS.Api.Services
{
    public class EstadisticasService : IEstadisticasService
    {
        private readonly AppDbContext _context;

        public EstadisticasService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<DashboardEstadisticasDto> ObtenerDashboardEstadisticasAsync()
        {
            var hoy = DateTime.UtcNow;
            var mesActual = hoy.Month;
            var anioActual = hoy.Year;

            // 1. SALDOS IMPAGOS DE PEDIDOS ENTREGADOS
            // Filtrados por Estado == Entregado (3) y Saldo > 0
            var ordenesImpagasQuery = _context.Ordenes
                .Include(o => o.Cliente)
                .Include(o => o.Detalles)
                .Where(o => o.Saldo > 0 && o.Estado == EstadoOrden.Entregado);

            var totalSaldoImpago = await ordenesImpagasQuery.SumAsync(o => o.Saldo);
            var cantOrdenesSaldo = await ordenesImpagasQuery.CountAsync();

            var listadoSaldosImpagos = await ordenesImpagasQuery
                .OrderByDescending(o => o.FechaEntrega)
                .Select(o => new SaldoImpagoDto
                {
                    NumeroOrden = o.Id.ToString(),
                    ClienteNombre = o.Cliente != null ? o.Cliente.Nombre : (o.NombreCliente ?? "Sin Cliente"),
                    FechaEntrega = o.FechaEntrega.ToString("dd/MM/yyyy"),
                    Total = o.ImporteTotal,
                    MontoPagado = o.ImporteTotal - o.Saldo,
                    SaldoPendiente = o.Saldo,
                    Telefono = o.Cliente != null ? o.Cliente.Telefono : (o.Telefono ?? "")
                })
                .ToListAsync();

            // 2. COBRADO EN EL MES (Ingresos reales)
            var totalCobradoMes = await _context.Cobros
                .Where(c => c.FechaCobro.Month == mesActual && c.FechaCobro.Year == anioActual)
                .SumAsync(c => (decimal?)c.Importe) ?? 0;

            // 3. EGRESOS EN EL MES (Sueldos, Modistas, Proveedores / Otros)
            var pagosMes = await _context.Pagos
                .Where(p => (p.FechaPago != null && p.FechaPago.Value.Month == mesActual && p.FechaPago.Value.Year == anioActual) ||
                            (p.FechaPago == null && p.FechaFactura.Month == mesActual && p.FechaFactura.Year == anioActual))
                .ToListAsync();

            var egresosSueldos = pagosMes.Where(p => (p.Concepto != null && p.Concepto.Contains("Sueldo", StringComparison.OrdinalIgnoreCase)) || (p.Proveedor != null && p.Proveedor.Contains("Sueldo", StringComparison.OrdinalIgnoreCase))).Sum(p => p.Importe);
            var egresosModistas = pagosMes.Where(p => (p.Concepto != null && p.Concepto.Contains("Modista", StringComparison.OrdinalIgnoreCase)) || (p.Proveedor != null && p.Proveedor.Contains("Modista", StringComparison.OrdinalIgnoreCase))).Sum(p => p.Importe);

            // Todo lo demás entra en Proveedores / Gastos Generales ("Otros")
            var egresosOtros = pagosMes.Where(p =>
                (p.Concepto == null || (!p.Concepto.Contains("Sueldo", StringComparison.OrdinalIgnoreCase) && !p.Concepto.Contains("Modista", StringComparison.OrdinalIgnoreCase))) &&
                (p.Proveedor == null || (!p.Proveedor.Contains("Sueldo", StringComparison.OrdinalIgnoreCase) && !p.Proveedor.Contains("Modista", StringComparison.OrdinalIgnoreCase)))
            ).Sum(p => p.Importe);

            // 4. PRENDAS PRODUCIDAS EN EL MES (Conteo basado en los detalles de las órdenes del mes actual)
            var ordenesMes = await _context.Ordenes
                .Include(o => o.Detalles)
                .Where(o => o.FechaPedido.Month == mesActual && o.FechaPedido.Year == anioActual)
                .ToListAsync();

            int prendasMes = ordenesMes.SelectMany(o => o.Detalles).Sum(d => d.Cantidad);

            // 5. CÁLCULOS ANUALES PARA GRÁFICOS
            var mesesNom = new[] { "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic" };
            var facturadoMensual = new decimal[12];
            var cobradoMensual = new decimal[12];
            var prendasMensual = new int[12];

            var ordenesAnio = await _context.Ordenes
                .Include(o => o.Detalles)
                .Where(o => o.FechaPedido.Year == anioActual)
                .ToListAsync();

            foreach (var group in ordenesAnio.GroupBy(o => o.FechaPedido.Month))
            {
                facturadoMensual[group.Key - 1] = group.Sum(o => o.ImporteTotal);
                prendasMensual[group.Key - 1] = group.SelectMany(o => o.Detalles).Sum(d => d.Cantidad);
            }

            var cobrosAnio = await _context.Cobros
                .Where(c => c.FechaCobro.Year == anioActual)
                .ToListAsync();

            foreach (var group in cobrosAnio.GroupBy(c => c.FechaCobro.Month))
            {
                cobradoMensual[group.Key - 1] = group.Sum(c => c.Importe);
            }

            return new DashboardEstadisticasDto
            {
                Kpis = new KpisDto
                {
                    TotalSaldoImpago = totalSaldoImpago,
                    CantOrdenesSaldo = cantOrdenesSaldo,
                    PrendasMes = prendasMes,
                    TotalEgresosMes = egresosSueldos + egresosModistas + egresosOtros,
                    TotalCobradoMes = totalCobradoMes
                },
                SaldosImpagos = listadoSaldosImpagos,
                Graficos = new GraficosDto
                {
                    FacturadoVsCobrado = new SerieComparativaDto
                    {
                        Meses = mesesNom.ToList(),
                        Facturado = facturadoMensual.ToList(),
                        Cobrado = cobradoMensual.ToList()
                    },
                    DistribucionGastos = new DistribucionGastosDto
                    {
                        Sueldos = egresosSueldos,
                        Modistas = egresosModistas,
                        Otros = egresosOtros
                    },
                    PrendasPorMes = new SerieProduccionDto
                    {
                        Meses = mesesNom.ToList(),
                        Cantidades = prendasMensual.ToList()
                    }
                }
            };
        }
    }
}