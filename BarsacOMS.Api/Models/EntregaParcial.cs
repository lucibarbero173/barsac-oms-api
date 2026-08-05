namespace BarsacOMS.Api.Models
{
    public class EntregaParcial
    {
        public int Id { get; set; }
        public int FichaProduccionId { get; set; }

        // Datos de lo entregado
        public string Producto { get; set; } = string.Empty;
        public int Cantidades { get; set; }
        public string Talle { get; set; } = string.Empty;
        public int? Numero { get; set; }
        public string? Nombre { get; set; }

        // Estado de este ítem en la entrega ("Entregada" o "Parcial")
        public string EstadoItem { get; set; } = string.Empty;

        public DateTime FechaEntrega { get; set; } = DateTime.UtcNow;
    }
}