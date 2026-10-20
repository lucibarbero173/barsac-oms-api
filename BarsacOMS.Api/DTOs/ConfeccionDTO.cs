namespace BarsacOMS.Api.DTOs
{
    public class ModistaConfeccionDto
    {
        public int Id { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public bool Activa { get; set; }
    }

    // Fila en los listados de Confección (por asignar / recién asignadas).
    public class FichaConfeccionResumenDto
    {
        public int FichaId { get; set; }
        public int OrdenId { get; set; }
        public string Cliente { get; set; } = string.Empty;
        public DateTime? FechaEntrega { get; set; }
        public int Total { get; set; }
        public int Asignadas { get; set; }
        public int Cosidas { get; set; }
        public string Modistas { get; set; } = string.Empty;

        // Solo en "recién asignadas": cuándo se asignó la última prenda.
        public DateTime? FechaAsignacion { get; set; }
    }

    public class FichaConfeccionDetalleDto
    {
        public int FichaId { get; set; }
        public int OrdenId { get; set; }
        public string Cliente { get; set; } = string.Empty;
        public DateTime? FechaEntrega { get; set; }
        public string? ImagenDisenoBase64 { get; set; }
        public List<RenglonConfeccionDto> Renglones { get; set; } = new();
    }

    public class RenglonConfeccionDto
    {
        public int DetalleId { get; set; }
        public string Producto { get; set; } = string.Empty;
        public string? Talle { get; set; }
        public int? Numero { get; set; }
        public string? Nombre { get; set; }
        public string? Detalle { get; set; }
        public int Cantidad { get; set; }
        public List<AsignacionModistaDto> Asignaciones { get; set; } = new();
    }

    // Cuántas prendas de un renglón cose una modista.
    public class AsignacionModistaDto
    {
        public int ModistaId { get; set; }
        public string? ModistaNombre { get; set; }
        public int Cantidad { get; set; }

        // Solo informativo al leer: cuántas de esas ya cosió (no se puede bajar de ahí).
        public int Cosidas { get; set; }
    }

    public class GuardarAsignacionRenglonDto
    {
        public int DetalleId { get; set; }
        public List<AsignacionModistaDto> Asignaciones { get; set; } = new();
    }
}
