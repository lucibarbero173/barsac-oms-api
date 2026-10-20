namespace BarsacOMS.Api.DTOs
{
    public class ModistaDTO
    {
        public int Id { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public bool Activa { get; set; }
        public int CantidadTarifas { get; set; }
        public int? UsuarioId { get; set; }
        public string? UsuarioEmail { get; set; }
    }

    public class GuardarModistaDTO
    {
        public string Nombre { get; set; } = string.Empty;
        public bool Activa { get; set; } = true;
    }

    // Un renglón por producto del catálogo: Precio null = esa modista no tiene tarifa cargada.
    public class TarifaModistaDTO
    {
        public int ProductoId { get; set; }
        public string ProductoNombre { get; set; } = string.Empty;
        public decimal? Precio { get; set; }
    }

    public class GuardarTarifaDTO
    {
        public int ProductoId { get; set; }
        public decimal? Precio { get; set; }
    }
}
