namespace BarsacOMS.Api.Models
{
    public enum EstadoCorte
    {
        Pendiente = 0,
        Completo = 1,
        Faltante = 2,
    }

    // Una fila por cada prenda física individual. El Id se usa directo como código de barras.
    // Atraviesa varias etapas en orden: Diseño -> Corte -> Control (escaneo).
    public class PrendaUnidad
    {
        public int Id { get; set; }

        public int DetalleFichaProduccionId { get; set; }

        // Etapa Diseño
        public bool DisenoListo { get; set; } = false;
        public DateTime? FechaDiseno { get; set; }
        public int? DisenoPorUsuarioId { get; set; }

        // Etapa Corte
        public EstadoCorte CorteEstado { get; set; } = EstadoCorte.Pendiente;
        public string? CorteDetalleFaltante { get; set; }
        public DateTime? FechaCorte { get; set; }
        public int? CortadoPorUsuarioId { get; set; }

        // Etapa Control (escaneo de Mirta)
        public bool Controlada { get; set; } = false;
        public DateTime? FechaControl { get; set; }
        public int? ControladoPorUsuarioId { get; set; }
    }
}
