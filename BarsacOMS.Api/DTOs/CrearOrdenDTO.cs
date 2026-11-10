using BarsacOMS.Api.Models;

namespace BarsacOMS.Api.DTOs
{
    public class CrearOrdenDTO
    {
        public int ClienteId { get; set; }

        public DateTime FechaPedido { get; set; }
        public DateTime FechaEntrega { get; set; }

        public EstadoOrden Estado { get; set; }

        public string FormaPago { get; set; } = "efectivo";

        public List<CrearDetalleDTO> Detalles { get; set; }
    }
}
