namespace BarsacOMS.Api.DTOs
{
    public class CrearDetalleDTO
    {
        public int ProductoId { get; set; }
        public string Talle { get; set; }
        public int Cantidad { get; set; }

        // AGREGÁ ESTA LÍNEA
        public decimal PrecioUnitario { get; set; }
    }
}