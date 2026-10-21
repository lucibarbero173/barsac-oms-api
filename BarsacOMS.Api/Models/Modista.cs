namespace BarsacOMS.Api.Models
{
    // Modista externa que cose las prendas. Cada una cobra su propia tarifa por producto.
    public class Modista
    {
        public int Id { get; set; }
        public string Nombre { get; set; } = string.Empty;

        // Usuario con el que entra al sistema a ver lo que tiene asignado (pantalla de la
        // modista, fase siguiente). Opcional: puede existir la modista sin usuario todavía.
        public int? UsuarioId { get; set; }

        // Se da de baja en vez de borrarla, para no perder el historial de lo que cosió.
        public bool Activa { get; set; } = true;

        public List<TarifaModista> Tarifas { get; set; } = new();
    }

    // Liquidación: un pago a una modista por todo lo cosido que tenía pendiente de cobro.
    // Las prendas pagadas quedan apuntando a este pago (PrendaUnidad.PagoModistaId).
    public class PagoModista
    {
        public int Id { get; set; }
        public int ModistaId { get; set; }
        public DateTime Fecha { get; set; }
        public decimal Importe { get; set; }
        public int CantidadPrendas { get; set; }
        public string? Nota { get; set; }
    }

    public enum EstadoPrendaExtra
    {
        Pendiente = 0,
        Aprobada = 1,
        Rechazada = 2,
    }

    // Prendas que la modista cosió DE MÁS (le llegaron más de las que tenía asignadas).
    // Las carga ella desde Mis Prendas; solo se pagan si un admin las aprueba.
    public class PrendaExtraModista
    {
        public int Id { get; set; }
        public int ModistaId { get; set; }
        public int FichaProduccionId { get; set; }
        public string Producto { get; set; } = string.Empty;
        public int Cantidad { get; set; }
        public string? Nota { get; set; }
        public DateTime FechaCarga { get; set; }

        public EstadoPrendaExtra Estado { get; set; } = EstadoPrendaExtra.Pendiente;
        public DateTime? FechaRevision { get; set; }

        // Tarifa al momento de aprobar (null = no había tarifa; se reintenta al pagar)
        public decimal? PrecioUnitario { get; set; }

        // En qué pago se liquidó. Null = todavía no se pagó.
        public int? PagoModistaId { get; set; }
    }

    // Lo que cobra una modista por coser UNA prenda de un producto (ej. Tere, Remera Cool Elastic).
    public class TarifaModista
    {
        public int Id { get; set; }
        public int ModistaId { get; set; }
        public int ProductoId { get; set; }
        public Producto? Producto { get; set; }
        public decimal Precio { get; set; }
    }
}
