namespace BarsacOMS.Api.Models
{
    // Una fila por cada prenda física individual. El Id se usa directo como código de barras.
    public class PrendaUnidad
    {
        public int Id { get; set; }

        public int DetalleFichaProduccionId { get; set; }

        public bool Controlada { get; set; } = false;
        public DateTime? FechaControl { get; set; }
        public int? ControladoPorUsuarioId { get; set; }
    }
}
