namespace BarsacOMS.Api.DTOs
{
    // Una prenda individual con los datos de su línea de ficha ya resueltos (para imprimir etiquetas / pantalla de control)
    public class PrendaUnidadDto
    {
        public int Id { get; set; }
        public int DetalleFichaProduccionId { get; set; }
        public int OrdenId { get; set; }
        public string Producto { get; set; } = string.Empty;
        public string Talle { get; set; } = string.Empty;
        public int? Numero { get; set; }
        public string? Nombre { get; set; }
        public string? Detalle { get; set; }
        public bool Controlada { get; set; }
        public DateTime? FechaControl { get; set; }
    }

    public class EscanearResultadoDto
    {
        public bool Encontrada { get; set; }
        public bool YaEstabaControlada { get; set; }
        public PrendaUnidadDto? Prenda { get; set; }
        public int Controladas { get; set; }
        public int Total { get; set; }
        public bool OrdenListaParaEntregar { get; set; }
    }

    public class ResumenControlOrdenDto
    {
        public int OrdenId { get; set; }
        public int Total { get; set; }
        public int Controladas { get; set; }
        public int Pendientes { get; set; }
        public bool ListoParaEntregar { get; set; }
    }
}
