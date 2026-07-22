namespace BarsacOMS.Api.Models
{
    public class OrdenTrabajo
    {
        public int Id { get; set; }

        // Relación
        public int ClienteId { get; set; }
        public Cliente Cliente { get; set; }

        // Snapshot
        public string NombreCliente { get; set; }

        public string Telefono { get; set; }

        public string Solicitante { get; set; }

        public string Disciplina { get; set; }

        public string ListaPrecios { get; set; }

        // Fechas
        public DateTime FechaPedido { get; set; }

        public DateTime FechaEntrega { get; set; }

        // Estado
        public EstadoOrden Estado { get; set; }

        public string FormaPago { get; set; } = "efectivo";

        // Totales
        public decimal ImporteTotal { get; set; }

        public decimal? Senas { get; set; }

        public decimal? OtrosCobros { get; set; }

        public decimal Saldo { get; set; }


        // Detalle
        public List<DetallePedido> Detalles { get; set; } = new();
    }
}