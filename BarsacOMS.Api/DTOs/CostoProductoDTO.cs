namespace BarsacOMS.Api.DTOs
{
    // Fila completa de costeo de un producto: entrada manual + valores calculados,
    // lista para pintar tanto la pestaña individual como la tabla general.
    public class CostoProductoDto
    {
        public int ProductoId { get; set; }
        public string ProductoNombre { get; set; } = string.Empty;

        public int? MateriaPrimaTelaId { get; set; }
        public string? TelaNombre { get; set; }
        public decimal? TelaPrecioPorKilo { get; set; }

        public decimal PrendasPorKg { get; set; }
        public decimal Scrap { get; set; }
        public decimal Flete { get; set; }
        public decimal Cierre { get; set; }
        public decimal ElasticoCapucha { get; set; }
        public decimal Impresion { get; set; }
        public decimal Confeccion { get; set; }
        public decimal RemarquePorcentaje { get; set; }

        // Calculados
        public decimal CostoTelaUnitario { get; set; }
        public decimal OtrosCostosUnitario { get; set; }
        public decimal CostoTotal { get; set; }
        public decimal PrecioVentaEstimado { get; set; }
    }

    // Lo único que se puede editar a mano por producto.
    public class GuardarCostoProductoDto
    {
        public int? MateriaPrimaTelaId { get; set; }
        public decimal PrendasPorKg { get; set; }
        public decimal Scrap { get; set; } = 1;
        public decimal Flete { get; set; }
        public decimal Cierre { get; set; }
        public decimal ElasticoCapucha { get; set; }
        public decimal Impresion { get; set; }
        public decimal Confeccion { get; set; }
        public decimal RemarquePorcentaje { get; set; }
    }
}
