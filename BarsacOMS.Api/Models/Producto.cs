namespace BarsacOMS.Api.Models
{
    public class Producto
    {
        public int Id { get; set; }

        public string Nombre { get; set; }

        public List<PrecioProducto> Precios { get; set; } = new();
    }
}
