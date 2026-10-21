namespace BarsacOMS.Api.DTOs
{
    // Una ficha vista por la modista: solo los renglones donde tiene prendas asignadas.
    public class FichaModistaDto
    {
        public int FichaId { get; set; }
        public int OrdenId { get; set; }
        public string Cliente { get; set; } = string.Empty;
        public DateTime? FechaEntrega { get; set; }
        public bool TieneImagen { get; set; }
        public int Asignadas { get; set; }
        public int Cosidas { get; set; }
        public DateTime? FechaUltimaCosida { get; set; }
        public List<RenglonModistaDto> Renglones { get; set; } = new();

        // Lo que cargó como "cosí de más" en esta ficha
        public List<PrendaExtraDto> Extras { get; set; } = new();
    }

    public class PrendaExtraDto
    {
        public int Id { get; set; }
        public int FichaId { get; set; }
        public int OrdenId { get; set; }
        public string Cliente { get; set; } = string.Empty;
        public string Producto { get; set; } = string.Empty;
        public int Cantidad { get; set; }
        public string? Nota { get; set; }
        public DateTime FechaCarga { get; set; }
        public int Estado { get; set; } // 0 Pendiente, 1 Aprobada, 2 Rechazada
        public decimal? PrecioUnitario { get; set; }
        public bool Pagada { get; set; }
    }

    public class CargarPrendaExtraDto
    {
        public string Producto { get; set; } = string.Empty;
        public int Cantidad { get; set; }
        public string? Nota { get; set; }
    }

    public class RenglonModistaDto
    {
        public int DetalleId { get; set; }
        public string Producto { get; set; } = string.Empty;
        public string? Talle { get; set; }
        public int? Numero { get; set; }
        public string? Nombre { get; set; }
        public string? Detalle { get; set; }
        public int Asignadas { get; set; }
        public int Cosidas { get; set; }
    }

    public class MarcarCosidasDto
    {
        public int Cosidas { get; set; }
    }
}
