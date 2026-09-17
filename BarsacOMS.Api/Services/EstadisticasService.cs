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

            // 1. SALDOS IMPAGOS DE PEDIDOS ENTREGADOS (Protegido contra nulos)
            var ordenesImpagasQuery = _context.Ordenes
                .Include(o => o.Cliente)
                .Include(o => o.Detalles)
                .Where(o => o.Saldo > 0 && o.Estado == EstadoOrden.Entregado);

            var totalSaldoImpago = await ordenesImpagasQuery.SumAsync(o => (decimal?)o.Saldo) ?? 0;
            var cantOrdenesSaldo = await ordenesImpagasQuery.CountAsync();

            var listadoSaldosImpagos = await ordenesImpagasQuery
                .OrderByDescending(o => o.FechaEntrega)
                .Select(o => new SaldoImpagoDto
                {
                    NumeroOrden = o.Id.ToString(),
                    ClienteNombre = o.Cliente != null ? o.Cliente.Nombre : (o.NombreCliente ?? "Sin Cliente"),
                    FechaEntrega = o.FechaEntrega != null ? o.FechaEntrega.ToString("dd/MM/yyyy") : "-",
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

            // 3. EGRESOS EN EL MES (Evaluado de forma segura en memoria para evitar errores de traducción SQL con nulos)
            var pagosList = await _context.Pagos.ToListAsync();
            var pagosMes = pagosList.Where(p =>
                (p.FechaPago != null && p.FechaPago.Value.Month == mesActual && p.FechaPago.Value.Year == anioActual) ||
                (p.FechaPago == null && p.FechaFactura.Month == mesActual && p.FechaFactura.Year == anioActual)
            ).ToList();

            var egresosSueldos = pagosMes
                .Where(p => (!string.IsNullOrEmpty(p.Concepto) && p.Concepto.Contains("Sueldo", StringComparison.OrdinalIgnoreCase)) ||
                            (!string.IsNullOrEmpty(p.Proveedor) && p.Proveedor.Contains("Sueldo", StringComparison.OrdinalIgnoreCase)))
                .Sum(p => p.Importe);

            var egresosModistas = pagosMes
                .Where(p => (!string.IsNullOrEmpty(p.Concepto) && p.Concepto.Contains("Modista", StringComparison.OrdinalIgnoreCase)) ||
                            (!string.IsNullOrEmpty(p.Proveedor) && p.Proveedor.Contains("Modista", StringComparison.OrdinalIgnoreCase)))
                .Sum(p => p.Importe);

            var egresosOtros = pagosMes
                .Where(p =>
                    (string.IsNullOrEmpty(p.Concepto) || (!p.Concepto.Contains("Sueldo", StringComparison.OrdinalIgnoreCase) && !p.Concepto.Contains("Modista", StringComparison.OrdinalIgnoreCase))) &&
                    (string.IsNullOrEmpty(p.Proveedor) || (!p.Proveedor.Contains("Sueldo", StringComparison.OrdinalIgnoreCase) && !p.Proveedor.Contains("Modista", StringComparison.OrdinalIgnoreCase)))
                )
                .Sum(p => p.Importe);

            // 4. PRENDAS PRODUCIDAS EN EL MES
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
                if (group.Key >= 1 && group.Key <= 12)
                {
                    facturadoMensual[group.Key - 1] = group.Sum(o => o.ImporteTotal);
                    prendasMensual[group.Key - 1] = group.SelectMany(o => o.Detalles).Sum(d => d.Cantidad);
                }
            }

            var cobrosAnio = await _context.Cobros
                .Where(c => c.FechaCobro.Year == anioActual)
                .ToListAsync();

            foreach (var group in cobrosAnio.GroupBy(c => c.FechaCobro.Month))
            {
                if (group.Key >= 1 && group.Key <= 12)
                {
                    cobradoMensual[group.Key - 1] = group.Sum(c => c.Importe);
                }
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

        // Cada PrendaUnidad con CorteParteFaltante cargado es un defecto que realmente ocurrió,
        // sin importar si después se resolvió (CorteService ya no borra esos campos al completar).
        public async Task<EstadisticasFaltantesDto> ObtenerEstadisticasFaltantesAsync()
        {
            var registros = await (
                from u in _context.PrendasUnidad
                where u.CorteParteFaltante != null
                join d in _context.DetallesFichaProduccion on u.DetalleFichaProduccionId equals d.Id
                join f in _context.FichasProduccion on d.FichaProduccionId equals f.Id
                join o in _context.Ordenes on f.OrdenId equals o.Id
                select new
                {
                    OrdenId = o.Id,
                    Cliente = o.Cliente != null ? o.Cliente.Nombre : o.NombreCliente,
                    d.Producto,
                    Parte = u.CorteParteFaltante!.Value
                }
            ).ToListAsync();

            var porPedido = registros
                .GroupBy(r => new { r.OrdenId, r.Cliente })
                .Select(g => new FaltantesPorPedidoDto
                {
                    OrdenId = g.Key.OrdenId,
                    Cliente = g.Key.Cliente ?? "Sin cliente",
                    Total = g.Count(),
                    Partes = g.GroupBy(x => x.Parte)
                        .Select(pg => new ConteoParteDto { Parte = pg.Key, Cantidad = pg.Count() })
                        .OrderByDescending(pg => pg.Cantidad)
                        .ToList()
                })
                .OrderByDescending(x => x.OrdenId)
                .ToList();

            var porTela = registros
                .GroupBy(r => DetectarTelaPorProducto(r.Producto))
                .Select(g => new FaltantesPorTelaDto
                {
                    Tela = g.Key,
                    Total = g.Count(),
                    Partes = g.GroupBy(x => x.Parte)
                        .Select(pg => new ConteoParteDto { Parte = pg.Key, Cantidad = pg.Count() })
                        .OrderByDescending(pg => pg.Cantidad)
                        .ToList()
                })
                .OrderByDescending(x => x.Total)
                .ToList();

            return new EstadisticasFaltantesDto { PorPedido = porPedido, PorTela = porTela };
        }

        // Mismo criterio que detectarCategoriaPorProducto en corte.js: el nombre del producto
        // ya suele traer la tela adentro (ej. "Remera Dryfit"), así que se busca por palabra
        // clave en vez de pedir que se cargue la tela en otro lado.
        private static readonly (string Clave, string Etiqueta)[] TelasConocidas = new[]
        {
            ("cool elastic", "Cool Elastic"),
            ("softshell", "SoftShell"),
            ("soft shell", "SoftShell"),
            ("microfibra", "Microfibra"),
            ("dry fit", "Dryfit"),
            ("dryfit", "Dryfit"),
            ("lycra", "Lycra"),
            ("energy", "Energy"),
            ("trucker", "Trucker"),
            ("truker", "Trucker"),
            ("spum", "Spum"),
        };

        private static string DetectarTelaPorProducto(string? producto)
        {
            var n = (producto ?? string.Empty).ToLowerInvariant();
            foreach (var (clave, etiqueta) in TelasConocidas)
            {
                if (n.Contains(clave)) return etiqueta;
            }
            return "Sin tela detectada";
        }
    }
}