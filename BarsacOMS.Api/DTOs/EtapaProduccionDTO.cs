using BarsacOMS.Api.Models;

namespace BarsacOMS.Api.DTOs
{
    // Fila en el listado de fichas pendientes de Diseño o Corte.
    public class FichaResumenEtapaDto
    {
        public int FichaId { get; set; }
        public int OrdenId { get; set; }
        public string Cliente { get; set; } = string.Empty;
        public DateTime? FechaEntrega { get; set; }
        public int Total { get; set; }
        public int Completadas { get; set; }
        public EstadoOrden Estado { get; set; }
    }

    // Detalle completo de una ficha para trabajar en Diseño o Corte.
    public class FichaDetalleEtapaDto
    {
        public int FichaId { get; set; }
        public int OrdenId { get; set; }
        public string Cliente { get; set; } = string.Empty;
        public DateTime? FechaEntrega { get; set; }
        public string? ImagenDisenoBase64 { get; set; }
        public EstadoOrden Estado { get; set; }
        public List<PrendaEtapaDto> Prendas { get; set; } = new();
    }

    public class PrendaEtapaDto
    {
        public int Id { get; set; }
        public string Producto { get; set; } = string.Empty;
        public string? Talle { get; set; }
        public int? Numero { get; set; }
        public string? Nombre { get; set; }
        public string? Detalle { get; set; }

        public bool DisenoListo { get; set; }
        public EstadoCorte CorteEstado { get; set; }
        public ParteFaltante? CorteParteFaltante { get; set; }
        public string? CorteDetalleFaltante { get; set; }
    }

    public class ResultadoEtapaDto
    {
        public bool Encontrada { get; set; }
        public int Completadas { get; set; }
        public int Total { get; set; }
        public EstadoOrden NuevoEstadoOrden { get; set; }
    }

    public class RegistrarFaltanteDto
    {
        public ParteFaltante Parte { get; set; }
        public string? Detalle { get; set; }
    }

    // Para el banner de alertas en la pantalla de Diseño.
    public class AlertaFaltanteDto
    {
        public int FichaId { get; set; }
        public int OrdenId { get; set; }
        public string Cliente { get; set; } = string.Empty;
        public List<PrendaFaltanteDto> Faltantes { get; set; } = new();
    }

    public class PrendaFaltanteDto
    {
        public string Producto { get; set; } = string.Empty;
        public string? Talle { get; set; }
        public string? Nombre { get; set; }
        public string? Detalle { get; set; }
        public ParteFaltante Parte { get; set; }
        public string? DetalleFaltante { get; set; }
    }

    // Cantidad de veces que salió mal una parte puntual (para desgloses por pedido o por tela).
    public class ConteoParteDto
    {
        public ParteFaltante Parte { get; set; }
        public int Cantidad { get; set; }
    }

    public class FaltantesPorPedidoDto
    {
        public int OrdenId { get; set; }
        public string Cliente { get; set; } = string.Empty;
        public int Total { get; set; }
        public List<ConteoParteDto> Partes { get; set; } = new();
    }

    public class FaltantesPorTelaDto
    {
        public string Tela { get; set; } = string.Empty;
        public int Total { get; set; }
        public List<ConteoParteDto> Partes { get; set; } = new();
    }

    public class EstadisticasFaltantesDto
    {
        public List<FaltantesPorPedidoDto> PorPedido { get; set; } = new();
        public List<FaltantesPorTelaDto> PorTela { get; set; } = new();
    }
}
