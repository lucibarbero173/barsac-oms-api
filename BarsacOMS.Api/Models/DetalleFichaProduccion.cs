namespace BarsacOMS.Api.Models
{
    public class DetalleFichaProduccion
    {
        public int Id { get; set; }

        public int FichaProduccionId { get; set; }

        public string Producto { get; set; }
        public int Cantidades { get; set; }
        public string Talle { get; set; }
        public int? Numero { get; set; }
        public string? Nombre { get; set; }
        public string? Detalle { get; set; } // Color/modelo, para la etiqueta impresa de cada prenda

        // Checks de taller (True/False o Fecha de realizado)
        public bool Archivo { get; set; } = false;
        public bool Impresion { get; set; } = false;
        public bool Calandra { get; set; } = false;
        public bool Corte { get; set; } = false;

        // Control de Entregas
        public bool Entregado { get; set; } = false;
        public DateTime? FechaEntrega { get; set; }

        public List<PrendaUnidad> Unidades { get; set; } = new();
    }
}