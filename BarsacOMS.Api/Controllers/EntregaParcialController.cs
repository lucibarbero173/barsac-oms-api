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

        public EntregaParcialController(IEntregaParcialService service)
        {
            _service = service;
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
    }
}