using Microsoft.EntityFrameworkCore;
using BarsacOMS.Api.Data;
using BarsacOMS.Api.DTOs;

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

            // 1. SALDOS IMPAGOS (Órdenes con saldo pendiente)
            var ordenesImpagasQuery = _context.Ordenes
                .Include(o => o.Cliente)
                .Where(o => o.Saldo > 0);

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

            // 2. COBRADO EN EL MES
            var totalCobradoMes = await _context.Cobros
                .Where(c => c.FechaCobro.Month == mesActual && c.FechaCobro.Year == anioActual)
                .SumAsync(c => (decimal?)c.Importe) ?? 0;

            // 3. EGRESOS EN EL MES (Utilizando MesPago o evaluando FechaPago / FechaFactura según tu modelo Pago)
            var pagosMes = await _context.Pagos
                .Where(p => (p.FechaPago != null && p.FechaPago.Value.Month == mesActual && p.FechaPago.Value.Year == anioActual) ||
                            (p.FechaPago == null && p.FechaFactura.Month == mesActual && p.FechaFactura.Year == anioActual))
                .ToListAsync();

            var egresosSueldos = pagosMes.Where(p => (p.Concepto != null && p.Concepto.Contains("Sueldo")) || (p.Proveedor != null && p.Proveedor.Contains("Sueldo"))).Sum(p => p.Importe);
            var egresosModistas = pagosMes.Where(p => (p.Concepto != null && p.Concepto.Contains("Modista")) || (p.Proveedor != null && p.Proveedor.Contains("Modista"))).Sum(p => p.Importe);
            var egresosOtros = pagosMes.Where(p =>
                (p.Concepto == null || (!p.Concepto.Contains("Sueldo") && !p.Concepto.Contains("Modista"))) &&
                (p.Proveedor == null || (!p.Proveedor.Contains("Sueldo") && !p.Proveedor.Contains("Modista")))
            ).Sum(p => p.Importe);

            // 4. PRENDAS PRODUCIDAS EN EL MES
            var detallesMes = await _context.DetallesFichaProduccion
                .Where(i => i.FechaEntrega != null && i.FechaEntrega.Value.Month == mesActual && i.FechaEntrega.Value.Year == anioActual)
                .ToListAsync();

            int prendasMes = detallesMes.Sum(i => i.Cantidades);

            // 5. CÁLCULOS ANUALES PARA GRÁFICOS
            var mesesNom = new[] { "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic" };
            var facturadoMensual = new decimal[12];
            var cobradoMensual = new decimal[12];
            var prendasMensual = new int[12];

            var ordenesAnio = await _context.Ordenes
                .Where(o => o.FechaPedido.Year == anioActual)
                .ToListAsync();

            foreach (var group in ordenesAnio.GroupBy(o => o.FechaPedido.Month))
            {
                facturadoMensual[group.Key - 1] = group.Sum(o => o.ImporteTotal);
            }

            var cobrosAnio = await _context.Cobros
                .Where(c => c.FechaCobro.Year == anioActual)
                .ToListAsync();

            foreach (var group in cobrosAnio.GroupBy(c => c.FechaCobro.Month))
            {
                cobradoMensual[group.Key - 1] = group.Sum(c => c.Importe);
            }

            var detallesAnio = await _context.DetallesFichaProduccion
                .Where(i => i.FechaEntrega != null && i.FechaEntrega.Value.Year == anioActual)
                .ToListAsync();

            foreach (var group in detallesAnio.GroupBy(i => i.FechaEntrega!.Value.Month))
            {
                prendasMensual[group.Key - 1] = group.Sum(i => i.Cantidades);
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