using BarsacOMS.Api.Models;
using BarsacOMS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarsacOMS.Api.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class EntregaParcialController : ControllerBase
    {
        private readonly IEntregaParcialService _service;
        private readonly IOrdenService _ordenService;
        private readonly IFichaProduccionService _fichaService;

        public EntregaParcialController(IEntregaParcialService service, IOrdenService ordenService, IFichaProduccionService fichaService)
        {
            _service = service;
            _ordenService = ordenService;
            _fichaService = fichaService;
        }

        [HttpGet("ficha/{fichaId}")]
        public async Task<ActionResult<IEnumerable<EntregaParcial>>> GetEntregasPorFicha(int fichaId)
        {
            var entregas = await _service.ObtenerPorFichaAsync(fichaId);
            return Ok(entregas);
        }

        [HttpPost("ficha/{fichaId}")]
        public async Task<IActionResult> RegistrarEntrega(int fichaId, [FromBody] List<EntregaParcial> entregas)
        {
            try
            {
                var resultado = await _service.RegistrarEntregaParcialAsync(fichaId, entregas);
                if (!resultado) return NotFound(new { message = "Ficha de producción no encontrada" });

                return Ok(new { message = "Entrega parcial registrada exitosamente" });
            }
            catch (Exception ex)
            {
                // Esto mostrará el error exacto en la respuesta HTTP
                return StatusCode(500, new { message = ex.Message, inner = ex.InnerException?.Message, stack = ex.StackTrace });
            }
        }

        [HttpPost("completa/{ordenId}")]
        public async Task<IActionResult> RegistrarEntregaCompleta(int ordenId)
        {
            try
            {
                // 1. Obtener la orden con sus detalles
                var orden = await _ordenService.ObtenerOrdenPorIdAsync(ordenId);
                if (orden == null)
                    return NotFound(new { message = "Orden no encontrada" });

                // 2. Obtener la FichaProduccion vinculada a esta orden
                var ficha = await _fichaService.ObtenerFichaPorOrdenAsync(ordenId);
                if (ficha == null)
                    return NotFound(new { message = "Ficha de Producción no encontrada para esta orden" });

                // 3. Crear una EntregaParcial con TODOS los detalles de la orden
                var entregasCompletas = new List<EntregaParcial>();

                if (orden.Detalles != null && orden.Detalles.Count > 0)
                {
                    foreach (var detalle in orden.Detalles)
                    {
                        var entrega = new EntregaParcial
                        {
                            FichaProduccionId = ficha.Id,
                            Producto = detalle.Producto?.Nombre ?? "Producto",
                            Cantidades = detalle.Cantidad,
                            Talle = detalle.Talle ?? "",
                            EstadoItem = "Entregada", // Completa
                            FechaEntrega = DateTime.UtcNow
                        };
                        entregasCompletas.Add(entrega);
                    }
                }

                // 4. Registrar las entregas (el servicio automáticamente actualizará el estado de la orden)
                var resultado = await _service.RegistrarEntregaParcialAsync(ficha.Id, entregasCompletas);
                if (!resultado)
                    return StatusCode(500, new { message = "Error al registrar las entregas" });

                return Ok(new { message = "Entrega completa registrada exitosamente", ordenId, fichaId = ficha.Id });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message, inner = ex.InnerException?.Message });
            }
        }
    }
}