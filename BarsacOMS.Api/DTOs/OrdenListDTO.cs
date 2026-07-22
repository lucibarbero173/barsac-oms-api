using BarsacOMS.Api.Models;

namespace BarsacOMS.Api.DTOs
{
    public class OrdenListDTO
    {
        public int Id { get; set; }
        public DateTime FechaPedido { get; set; }

        public DateTime FechaEntrega { get; set; }
        public int ClienteId { get; set; }

        public string NombreCliente { get; set; }
        public string Solicitante { get; set; }
        public string Disciplina { get; set; }

        public int CantidadPrendas { get; set; }

        public decimal ImporteTotal { get; set; }
        public decimal Senas { get; set; }
        public decimal? OtrosCobros { get; set; }
        public decimal Saldo { get; set; }

        public EstadoOrden Estado { get; set; }
    }
}
