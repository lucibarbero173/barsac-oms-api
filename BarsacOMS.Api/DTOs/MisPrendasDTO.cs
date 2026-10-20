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
