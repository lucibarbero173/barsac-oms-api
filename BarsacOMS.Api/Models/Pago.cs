using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BarsacOMS.Api.Models
{
    public enum EstadoPago
    {
        PENDIENTE = 0,
        PAGADO = 1
    }

    public class Pago
    {
        public int Id { get; set; }

        public DateTime FechaFactura { get; set; }

        [Required]
        [MaxLength(150)]
        public string Proveedor { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Concepto { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string MedioPago { get; set; } = "EFECTIVO";

        [Column(TypeName = "decimal(18,2)")]
        public decimal Importe { get; set; }

        public EstadoPago Estado { get; set; } = EstadoPago.PAGADO;

        public DateTime? FechaPago { get; set; }

        // Propiedad calculada o autogenerada para el Mes de Pago
        public int MesPago => FechaPago.HasValue ? FechaPago.Value.Month : FechaFactura.Month;
    }
}