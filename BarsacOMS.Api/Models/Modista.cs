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
