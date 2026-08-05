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

        public List<DetalleFichaProduccion> Items { get; set; } = new();

        public List<EntregaParcial> EntregasParciales { get; set; } = new();
    }
}