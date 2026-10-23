using System.Security.Claims;
using BarsacOMS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarsacOMS.Api.Controllers
{
    [Authorize(Roles = "admin,super,impresion")]
    [ApiController]
    [Route("api/[controller]")]
    public class ImpresionController : ControllerBase
    {
        private readonly IImpresionService _impresionService;

        public ImpresionController(IImpresionService impresionService)
        {
            _impresionService = impresionService;
        }

        private int? ObtenerUsuarioIdActual()
        {
            var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(idClaim, out var id) ? id : null;
        }

        [HttpGet("fichas")]
        public async Task<IActionResult> GetFichasPendientes()
        {
            return Ok(await _impresionService.ObtenerFichasPendientesAsync());
        }

        [HttpGet("fichas/recien-impresas")]
        public async Task<IActionResult> GetFichasRecienImpresas()
        {
            return Ok(await _impresionService.ObtenerFichasRecienImpresasAsync());
        }

        [HttpGet("fichas/{id}")]
        public async Task<IActionResult> GetFicha(int id)
        {
            var ficha = await _impresionService.ObtenerFichaAsync(id);
            if (ficha == null) return NotFound();
            return Ok(ficha);
        }

        // POST: api/Impresion/fichas/5/impresa  -> la ficha pasa a Corte
        [HttpPost("fichas/{id}/impresa")]
        public async Task<IActionResult> MarcarImpresa(int id)
        {
            var (exito, error) = await _impresionService.MarcarImpresaAsync(id, ObtenerUsuarioIdActual());
            if (!exito) return BadRequest(error);
            return NoContent();
        }

        // POST: api/Impresion/fichas/5/deshacer  -> vuelve a Impresión si Corte no empezó
        [HttpPost("fichas/{id}/deshacer")]
        public async Task<IActionResult> Deshacer(int id)
        {
            var (exito, error) = await _impresionService.DeshacerImpresionAsync(id);
            if (!exito) return BadRequest(error);
            return NoContent();
        }
    }
}
