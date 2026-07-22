namespace BarsacOMS.Api.Models
{
    public class MateriaPrima
    {
        // Datos Base
        public int Id { get; set; }
        public string NroArticulo { get; set; } = string.Empty;
        public string Nombre { get; set; } = string.Empty;

        // El "Tipo" general (Ej: para tela: "Algodón", "Poliéster"; para tinta: "DTF", "Sublimación")
        public string Tipo { get; set; } = string.Empty;

        // Propiedades específicas de TELAS
        public decimal? MetrosRindePorKilo { get; set; }
        public decimal? PrecioPorKilo { get; set; }

        // Propiedades específicas de TINTAS
        public string? Color { get; set; }
        public decimal? PrecioPorLitro { get; set; }

        // Propiedades específicas de PAPEL
        public int? Gramaje { get; set; }
        public decimal? MetrosPorRollo { get; set; }
        public decimal? PrecioPorRollo { get; set; }

        // Relación con el Proveedor
        public int ProveedorId { get; set; }
        public Proveedor? Proveedor { get; set; }
    }
}