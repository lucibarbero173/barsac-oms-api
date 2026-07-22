namespace BarsacOMS.Api.DTOs
{
    public class ProductoListDTO
    {
        public int Id { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public decimal PrecioAdultoEfectivo { get; set; }
        public decimal PrecioAdultoTransf { get; set; }
        public decimal PrecioNinoEfectivo { get; set; }
        public decimal PrecioNinoTransf { get; set; }
    }
}
