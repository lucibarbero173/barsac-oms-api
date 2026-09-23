using System.Collections.Generic;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation; // <--- Importante

namespace BarsacOMS.Api.Models
{
    public class FichaProduccion
    {
        public int Id { get; set; }

        public int OrdenId { get; set; }

        [ValidateNever] // <--- AGREGÁ ESTO
        public OrdenTrabajo Orden { get; set; }

        public string Modista { get; set; }

        // Estado de PRODUCCIÓN de esta ficha en particular (Diseño/Corte/Apto Confección),
        // independiente de las demás fichas de la misma orden. Antes este progreso se
        // calculaba mezclando las prendas de TODAS las fichas de la orden, así que una
        // ficha recién creada podía "heredar" el estado avanzado de otra ficha vieja de la
        // misma orden. Orden.Estado ahora se recalcula como agregado (la ficha más
        // atrasada) cada vez que el estado de una ficha cambia.
        public EstadoOrden EstadoFicha { get; set; } = EstadoOrden.Pendiente;

        // Imagen del diseño, cargada por el diseñador (reemplaza el Word aparte).
        public string? ImagenDisenoBase64 { get; set; }

        // Entrega de esta tanda puntual (un pedido puede tener varias fichas = varias tandas).
        public bool Entregada { get; set; } = false;
        public DateTime? FechaEntregaFicha { get; set; }

        public List<DetalleFichaProduccion> Items { get; set; } = new();

        public List<EntregaParcial> EntregasParciales { get; set; } = new();
    }
}