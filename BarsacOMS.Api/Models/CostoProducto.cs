namespace BarsacOMS.Api.Models
{
    public class CostoProducto
    {
        public int Id { get; set; }

        public int ProductoId { get; set; }
        public Producto? Producto { get; set; }

        // Tela elegida para costear este producto. Se guarda solo la referencia:
        // el precio se calcula siempre en vivo contra el precio actual de esa Materia Prima.
        public int? MateriaPrimaTelaId { get; set; }
        public MateriaPrima? MateriaPrimaTela { get; set; }

        public decimal PrendasPorKg { get; set; }
        public decimal Scrap { get; set; } = 1;
        public decimal Flete { get; set; }
        public decimal Cierre { get; set; }
        public decimal ElasticoCapucha { get; set; }
        public decimal Impresion { get; set; }
        public decimal Confeccion { get; set; }

        // Margen manual por producto, en porcentaje (no todas las prendas se remarcan igual).
        public decimal RemarquePorcentaje { get; set; }
    }
}
