namespace BarsacOMS.Api.Models
{
    public class Cobro
    {
        public int Id { get; set; }
        public int? OrdenId { get; set; }
        public DateTime FechaCobro { get; set; } = DateTime.Now;
        public int? ClienteId { get; set; }
        public string? NombreCliente { get; set; }
        public string? NombreOrdenante { get; set; }
        public string Concepto { get; set; } = "ENTREGA";
        public string MedioCobro { get; set; } = "EFECTIVO";
        public decimal Importe { get; set; }

        // Propiedad de navegación
        public OrdenTrabajo? Orden { get; set; }
    }
}