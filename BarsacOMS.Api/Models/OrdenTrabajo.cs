namespace BarsacOMS.Api.Models
{
    public class OrdenTrabajo
    {
        public int Id { get; set; }
        public int ClienteId { get; set; }
        public DateTime FechaPedido { get; set; }
        public DateTime FechaEntrega { get; set; }
        public string Estado { get; set; }

        public Cliente Cliente { get; set; }
        public List<DetallePedido> Detalles { get; set; }
    }
}
