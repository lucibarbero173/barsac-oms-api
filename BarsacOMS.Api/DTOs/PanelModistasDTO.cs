namespace BarsacOMS.Api.DTOs
{
    public class PanelModistasDto
    {
        public DateTime Desde { get; set; }
        public DateTime Hasta { get; set; }

        // Totales de todas las modistas (para las tarjetas de arriba)
        public int FaltaCoser { get; set; }
        public int AsignadasPeriodo { get; set; }
        public int CosidasPeriodo { get; set; }
        public decimal APagar { get; set; }
        public int PrendasAPagar { get; set; }
        public int SinTarifa { get; set; }
        public int ExtrasPendientes { get; set; }

        public List<ResumenModistaPanelDto> Modistas { get; set; } = new();

        // Gráfico: prendas cosidas por semana (lunes a domingo), una serie por modista
        public List<DateTime> Semanas { get; set; } = new();
        public List<SerieModistaDto> Series { get; set; } = new();
    }

    public class ResumenModistaPanelDto
    {
        public int ModistaId { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public bool Activa { get; set; }

        // Estado actual (no depende del período)
        public int FaltaCoser { get; set; }
        public decimal APagar { get; set; }
        public int PrendasAPagar { get; set; }
        public int SinTarifa { get; set; }

        // Prendas "cosí de más" que cargó y esperan aprobación
        public int ExtrasPendientes { get; set; }

        // Dentro del período elegido
        public int AsignadasPeriodo { get; set; }
        public int CosidasPeriodo { get; set; }

        public DateTime? UltimaCosida { get; set; }
        public DateTime? UltimoPago { get; set; }
    }

    public class SerieModistaDto
    {
        public int ModistaId { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public List<int> Valores { get; set; } = new();
    }

    public class DetalleModistaPanelDto
    {
        public int ModistaId { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public List<PendienteCoserDto> Pendientes { get; set; } = new();
        public List<LineaAPagarDto> APagar { get; set; } = new();
        public List<PagoModistaDto> Pagos { get; set; } = new();
        public List<PrendaExtraDto> Extras { get; set; } = new();

        // Resumen por ficha: cuánto le asignaron, cuánto cosió y cuándo terminó
        public List<TrabajoModistaDto> Trabajos { get; set; } = new();
    }

    public class TrabajoModistaDto
    {
        public int FichaId { get; set; }
        public int OrdenId { get; set; }
        public string Cliente { get; set; } = string.Empty;
        public DateTime? FechaEntrega { get; set; }
        public int Asignadas { get; set; }
        public int Cosidas { get; set; }
        public DateTime? PrimeraCosida { get; set; }

        // Día en que marcó la última prenda que tenía asignada en la ficha (null = en curso)
        public DateTime? FechaTerminada { get; set; }
    }

    public class PendienteCoserDto
    {
        public int FichaId { get; set; }
        public int OrdenId { get; set; }
        public string Cliente { get; set; } = string.Empty;
        public DateTime? FechaEntrega { get; set; }
        public string Producto { get; set; } = string.Empty;
        public string? Talle { get; set; }
        public int? Numero { get; set; }
        public string? Nombre { get; set; }
        public int Asignadas { get; set; }
        public int Cosidas { get; set; }
    }

    // Lo cosido sin pagar, agrupado por producto y precio. Precio null = no tenía tarifa.
    public class LineaAPagarDto
    {
        public string Producto { get; set; } = string.Empty;
        public decimal? Precio { get; set; }
        public int Cantidad { get; set; }
        public decimal Subtotal { get; set; }
        public bool EsExtra { get; set; }
    }

    public class PagoModistaDto
    {
        public int Id { get; set; }
        public DateTime Fecha { get; set; }
        public decimal Importe { get; set; }
        public int CantidadPrendas { get; set; }
        public string? Nota { get; set; }
    }

    public class RegistrarPagoModistaDto
    {
        public string? Nota { get; set; }
    }

    public class ResultadoPagoModistaDto
    {
        public decimal Importe { get; set; }
        public int CantidadPrendas { get; set; }

        // Cosidas que quedaron afuera del pago porque ni antes ni ahora tienen tarifa cargada
        public int SinTarifa { get; set; }
    }
}
