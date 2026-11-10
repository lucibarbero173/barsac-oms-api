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
                // Entregados del todo o en parte: el cliente ya se llevó prendas y todavía debe
                .Where(o => o.Saldo > 0 && (o.Estado == EstadoOrden.Entregado || o.Estado == EstadoOrden.EntregadoParcial));

            var totalSaldoImpago = await ordenesImpagasQuery.SumAsync(o => (decimal?)o.Saldo) ?? 0;
            var cantOrdenesSaldo = await ordenesImpagasQuery.CountAsync();

            var listadoSaldosImpagos = await ordenesImpagasQuery
                .OrderByDescending(o => o.FechaEntrega)
                .Select(o => new SaldoImpagoDto
                {
                    NumeroOrden = o.Id.ToString(),
                    ClienteNombre = o.Cliente != null ? o.Cliente.Nombre : (o.NombreCliente ?? "Sin Cliente"),
                    FechaEntrega = o.FechaEntrega != null ? o.FechaEntrega.ToString("dd/MM/yyyy") : "-",
                    FechaEntregaIso = o.FechaEntrega.ToString("yyyy-MM-dd"),
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
            // Solo lo que efectivamente se pagó (igual que Conciliación), por la fecha en que se pagó.
            // Los PENDIENTES todavía no son egreso.
            var pagosList = await _context.Pagos.Where(p => p.Estado == EstadoPago.PAGADO).ToListAsync();
            var pagosMes = pagosList.Where(p =>
            {
                var fecha = p.FechaPago ?? p.FechaFactura;
                return fecha.Month == mesActual && fecha.Year == anioActual;
            }).ToList();

            // Por concepto: "Modistas" es lo que se les paga por coser ("Insumo modistas" es un
            // insumo, va a Otros); "Sueldo..." son los sueldos.
            static bool EsSueldo(Pago p) => (p.Concepto ?? "").Contains("Sueldo", StringComparison.OrdinalIgnoreCase);
            static bool EsModista(Pago p) => string.Equals((p.Concepto ?? "").Trim(), "Modistas", StringComparison.OrdinalIgnoreCase);

            var egresosSueldos = pagosMes.Where(EsSueldo).Sum(p => p.Importe);
            var egresosModistas = pagosMes.Where(p => !EsSueldo(p) && EsModista(p)).Sum(p => p.Importe);
            var egresosOtros = pagosMes.Where(p => !EsSueldo(p) && !EsModista(p)).Sum(p => p.Importe);

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
                    d.Talle,
                    Parte = u.CorteParteFaltante!.Value
                }
            ).ToListAsync();

            // Por pedido se desglosa por prenda (producto + talle) y parte, para saber QUÉ salió mal
            var porPedido = registros
                .GroupBy(r => new { r.OrdenId, r.Cliente })
                .Select(g => new FaltantesPorPedidoDto
                {
                    OrdenId = g.Key.OrdenId,
                    Cliente = g.Key.Cliente ?? "Sin cliente",
                    Total = g.Count(),
                    Partes = g.GroupBy(x => new { x.Producto, x.Talle, x.Parte })
                        .Select(pg => new ConteoParteDto
                        {
                            Parte = pg.Key.Parte,
                            Cantidad = pg.Count(),
                            Producto = pg.Key.Producto,
                            Talle = pg.Key.Talle
                        })
                        .OrderBy(pg => pg.Producto)
                        .ThenByDescending(pg => pg.Cantidad)
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