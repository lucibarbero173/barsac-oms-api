namespace BarsacOMS.Api.DTOs
{
    public class CrearOrdenDTO
    {
        public int ClienteId { get; set; }
        public DateTime FechaPedido { get; set; }
        public DateTime FechaEntrega { get; set; }
        public string Estado { get; set; }
        public List<DetalleDTO> Detalles { get; set; }
    }

    public class DetalleDTO
    {
        public string Tela { get; set; }
        public string Producto { get; set; }
        public string Talle { get; set; }
        public int Numero { get; set; }
        public string Nombre { get; set; }
        public string Imagen { get; set; }
    }
}
