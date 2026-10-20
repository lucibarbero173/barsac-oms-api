using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarsacOMS.Api.Controllers
{
    [Authorize(Roles = "admin,super,corte")]
    [ApiController]
    [Route("api/[controller]")]
    public class ConfeccionController : ControllerBase
    {
        private readonly IConfeccionService _confeccionService;

        public ConfeccionController(IConfeccionService confeccionService)
        {
            _confeccionService = confeccionService;
        }

        // Solo id/nombre/activa: corte necesita la lista para repartir, pero no las tarifas ni
        // los usuarios (eso queda en api/Modista, solo admin).
        [HttpGet("modistas")]
        public async Task<IActionResult> GetModistas()
        {
            return Ok(await _confeccionService.ObtenerModistasAsync());
        }

        [HttpGet("fichas")]
        public async Task<IActionResult> GetFichasPorAsignar()
        {
            return Ok(await _confeccionService.ObtenerFichasPorAsignarAsync());
        }

        [HttpGet("fichas/recien-asignadas")]
        public async Task<IActionResult> GetFichasRecienAsignadas()
        {
            return Ok(await _confeccionService.ObtenerFichasRecienAsignadasAsync());
        }

        [HttpGet("fichas/{id}")]
        public async Task<IActionResult> GetFicha(int id)
        {
            var ficha = await _confeccionService.ObtenerFichaAsync(id);
            if (ficha == null) return NotFound();
            return Ok(ficha);
        }

        // PUT: api/Confeccion/fichas/5/asignaciones
        [HttpPut("fichas/{id}/asignaciones")]
        public async Task<IActionResult> GuardarAsignaciones(int id, [FromBody] List<GuardarAsignacionRenglonDto> renglones)
        {
            var (exito, error) = await _confeccionService.GuardarAsignacionesAsync(id, renglones);
            if (!exito) return BadRequest(error);
            return NoContent();
        }
    }
}
