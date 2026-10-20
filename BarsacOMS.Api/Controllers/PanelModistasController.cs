using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarsacOMS.Api.Controllers
{
    [Authorize(Roles = "admin,super")]
    [ApiController]
    [Route("api/[controller]")]
    public class PanelModistasController : ControllerBase
    {
        private readonly IPanelModistasService _panelService;

        public PanelModistasController(IPanelModistasService panelService)
        {
            _panelService = panelService;
        }

        // GET: api/PanelModistas?desde=2026-09-01&hasta=2026-10-20
        [HttpGet]
        public async Task<IActionResult> GetPanel([FromQuery] DateTime? desde, [FromQuery] DateTime? hasta)
        {
            return Ok(await _panelService.ObtenerPanelAsync(desde, hasta));
        }

        // GET: api/PanelModistas/modista/5
        [HttpGet("modista/{id}")]
        public async Task<IActionResult> GetDetalle(int id)
        {
            var detalle = await _panelService.ObtenerDetalleAsync(id);
            if (detalle == null) return NotFound();
            return Ok(detalle);
        }

        // POST: api/PanelModistas/modista/5/pagos
        [HttpPost("modista/{id}/pagos")]
        public async Task<IActionResult> RegistrarPago(int id, [FromBody] RegistrarPagoModistaDto dto)
        {
            var (resultado, error) = await _panelService.RegistrarPagoAsync(id, dto.Nota);
            if (resultado == null) return BadRequest(error);
            return Ok(resultado);
        }

        // DELETE: api/PanelModistas/pagos/7
        [HttpDelete("pagos/{id}")]
        public async Task<IActionResult> AnularPago(int id)
        {
            var ok = await _panelService.AnularPagoAsync(id);
            if (!ok) return NotFound();
            return NoContent();
        }
    }
}
