namespace BarsacOMS.Api.DTOs
{
    public class DashboardEstadisticasDto
    {
        public KpisDto Kpis { get; set; } = new();
        public List<SaldoImpagoDto> SaldosImpagos { get; set; } = new();
        public GraficosDto Graficos { get; set; } = new();
    }

    public class KpisDto
    {
        public decimal TotalSaldoImpago { get; set; }
        public int CantOrdenesSaldo { get; set; }
        public int PrendasMes { get; set; }
        public decimal TotalEgresosMes { get; set; }
        public decimal TotalCobradoMes { get; set; }
    }

    public class SaldoImpagoDto
    {
        public string NumeroOrden { get; set; } = string.Empty;
        public string ClienteNombre { get; set; } = string.Empty;
        public string FechaEntrega { get; set; } = string.Empty;
        public decimal Total { get; set; }
        public decimal MontoPagado { get; set; }
        public decimal SaldoPendiente { get; set; }
        public string Telefono { get; set; } = string.Empty;
    }

    public class GraficosDto
    {
        public SerieComparativaDto FacturadoVsCobrado { get; set; } = new();
        public DistribucionGastosDto DistribucionGastos { get; set; } = new();
        public SerieProduccionDto PrendasPorMes { get; set; } = new();
    }

    public class SerieComparativaDto
    {
        public List<string> Meses { get; set; } = new();
        public List<decimal> Facturado { get; set; } = new();
        public List<decimal> Cobrado { get; set; } = new();
    }

    public class DistribucionGastosDto
    {
        public decimal Sueldos { get; set; }
        public decimal Modistas { get; set; }
        public decimal Otros { get; set; }
    }

    public class SerieProduccionDto
    {
        public List<string> Meses { get; set; } = new();
        public List<int> Cantidades { get; set; } = new();
    }
}
