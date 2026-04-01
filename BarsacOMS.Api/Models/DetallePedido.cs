namespace BarsacOMS.Api.Models
{
    public class DetallePedido
    {
        public int Id { get; set; }
        public int OrdenId { get; set; }
        public string Tela { get; set; }
        public string Producto { get; set; }
        public string Talle { get; set; }
        public int Numero { get; set; }
        public string Nombre { get; set; }
        public string Imagen { get; set; }

        public OrdenTrabajo Orden { get; set; }
    }
}
