namespace BarsacOMS.Api.Models
{
    public class DetallePedido
    {
        public int Id { get; set; }

        public int OrdenId { get; set; }
        public OrdenTrabajo Orden { get; set; }

        public int ProductoId { get; set; }
        public Producto Producto { get; set; }

        public string Talle { get; set; }

        public int Cantidad { get; set; }

        public decimal PrecioUnitario { get; set; }

        public decimal Total { get; set; }

    }
}