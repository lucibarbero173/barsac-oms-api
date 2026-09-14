using System.Security.Claims;
using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarsacOMS.Api.Controllers
{
    [Authorize(Roles = "admin,corte")]
    [ApiController]
    [Route("api/[controller]")]
    public class CorteController : ControllerBase
    {
        private readonly ICorteService _corteService;

        public CorteController(ICorteService corteService)
        {
            _corteService = corteService;
        }

        private int? ObtenerUsuarioIdActual()
        {
            var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(idClaim, out var id) ? id : null;
        }

        [HttpGet("fichas")]
        public async Task<IActionResult> GetFichasPendientes()
        {
            return Ok(await _corteService.ObtenerFichasPendientesAsync());
        }

        [HttpGet("fichas/{id}")]
        public async Task<IActionResult> GetFicha(int id)
        {
            var ficha = await _corteService.ObtenerFichaAsync(id);
            if (ficha == null) return NotFound();
            return Ok(ficha);
        }

        [HttpPost("unidad/{id}/completar")]
        public async Task<IActionResult> Completar(int id)
        {
            var resultado = await _corteService.CompletarUnidadAsync(id, ObtenerUsuarioIdActual());
            if (resultado == null) return NotFound();
            return Ok(resultado);
        }

        [HttpPost("unidad/{id}/faltante")]
        public async Task<IActionResult> Faltante(int id, [FromBody] RegistrarFaltanteDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Detalle)) return BadRequest(new { mensaje = "Describí qué falta." });

            var resultado = await _corteService.RegistrarFaltanteAsync(id, dto.Detalle, ObtenerUsuarioIdActual());
            if (resultado == null) return NotFound();
            return Ok(resultado);
        }
    }
}
