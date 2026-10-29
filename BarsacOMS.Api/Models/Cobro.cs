namespace BarsacOMS.Api.Models
{
    public class Cobro
    {
        public int Id { get; set; }

        // Cobro de UN solo pedido (la forma de siempre). Si el cobro se reparte entre varios
        // pedidos, queda en null y el reparto está en Asignaciones.
        public int? OrdenId { get; set; }
        public DateTime FechaCobro { get; set; } = DateTime.Now;
        public int? ClienteId { get; set; }
        public string? NombreCliente { get; set; }
        public string? NombreOrdenante { get; set; }
        public string Concepto { get; set; } = "ENTREGA";
        public string MedioCobro { get; set; } = "EFECTIVO";

        // Siempre el total que entró (ej. la transferencia completa): es lo que ve Conciliación
        public decimal Importe { get; set; }

        // Propiedad de navegación
        public OrdenTrabajo? Orden { get; set; }

        // Un mismo cobro repartido entre varios pedidos (ej. una transferencia de $1.000.000
        // para 3 pedidos del mismo cliente). La suma tiene que dar Importe.
        public List<CobroAsignacion> Asignaciones { get; set; } = new();
    }

    public class CobroAsignacion
    {
        public int Id { get; set; }
        public int CobroId { get; set; }
        public int OrdenId { get; set; }
        public decimal Importe { get; set; }
    }
}
