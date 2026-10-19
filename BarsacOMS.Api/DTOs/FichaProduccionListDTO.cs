using BarsacOMS.Api.Models;

namespace BarsacOMS.Api.DTOs
{
    // Solo lo que muestra la tabla de fichaProduccion.html. La imagen del diseño, los items,
    // las prendas y las entregas parciales se piden aparte (GET api/FichaProduccion/{id})
    // recién cuando se abre una ficha puntual, para no bajar todo de todas las fichas.
    public class FichaProduccionListDTO
    {
        public int Id { get; set; }
        public int OrdenId { get; set; }

        public string? NombreCliente { get; set; }
        public DateTime? FechaPedido { get; set; }
        public DateTime? FechaEntrega { get; set; }
        public EstadoOrden? EstadoOrden { get; set; }

        public string? Modista { get; set; }
        public EstadoOrden EstadoFicha { get; set; }
        public bool Entregada { get; set; }

        // Para el badge "Listo para Entregar" / "Incompleto": total de prendas de la ficha
        // y cuántas ya se escanearon en Control (PrendaUnidad.Controlada).
        public int TotalPrendas { get; set; }
        public int TotalControladas { get; set; }
    }
}
