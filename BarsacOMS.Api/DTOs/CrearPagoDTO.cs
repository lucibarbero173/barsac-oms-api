using BarsacOMS.Api.Models;

namespace BarsacOMS.Api.DTOs
{
    public class CrearPagoDTO
    {
        public DateTime FechaFactura { get; set; }
        public string Proveedor { get; set; } = string.Empty;
        public string Concepto { get; set; } = string.Empty;
        public string MedioPago { get; set; } = "EFECTIVO";
        public decimal Importe { get; set; }
        public EstadoPago Estado { get; set; }
        public DateTime? FechaPago { get; set; }
    }
}