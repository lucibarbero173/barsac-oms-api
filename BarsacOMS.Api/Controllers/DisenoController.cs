using System.Security.Claims;
using BarsacOMS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarsacOMS.Api.Controllers
{
    [Authorize(Roles = "admin,diseno")]
    [ApiController]
    [Route("api/[controller]")]
    public class DisenoController : ControllerBase
    {
        private readonly IDisenoService _disenoService;

        public DisenoController(IDisenoService disenoService)
        {
            _disenoService = disenoService;
        }

        private int? ObtenerUsuarioIdActual()
        {
            var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(idClaim, out var id) ? id : null;
        }

        [HttpGet("fichas")]
        public async Task<IActionResult> GetFichasPendientes()
        {
            return Ok(await _disenoService.ObtenerFichasPendientesAsync());
        }

        [HttpGet("fichas/{id}")]
        public async Task<IActionResult> GetFicha(int id)
        {
            var ficha = await _disenoService.ObtenerFichaAsync(id);
            if (ficha == null) return NotFound();
            return Ok(ficha);
        }

        [HttpPost("unidad/{id}/toggle")]
        public async Task<IActionResult> ToggleUnidad(int id)
        {
            var resultado = await _disenoService.ToggleUnidadAsync(id, ObtenerUsuarioIdActual());
            if (resultado == null) return NotFound();
            return Ok(resultado);
        }

        [HttpGet("alertas-faltantes")]
        public async Task<IActionResult> GetAlertasFaltantes()
        {
            return Ok(await _disenoService.ObtenerAlertasFaltantesAsync());
        }
    }
}
