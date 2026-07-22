namespace BarsacOMS.Api.Models
{
    public class PrecioProducto
    {
        public int Id { get; set; }

        public int ProductoId { get; set; }
        public Producto Producto { get; set; }

        public string Talle { get; set; } // ADULTO / NIÑO / ESPECIAL
        public string TipoPago { get; set; } // EFECTIVO / TRANSFERENCIA

        public decimal Precio { get; set; }
    }
}

