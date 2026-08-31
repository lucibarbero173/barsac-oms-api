using System.Security.Claims;
using BarsacOMS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarsacOMS.Api.Controllers
{
    [Authorize(Roles = "admin,control")]
    [Route("api/[controller]")]
    [ApiController]
    public class PrendaUnidadController : ControllerBase
    {
        private readonly IPrendaUnidadService _service;

        public PrendaUnidadController(IPrendaUnidadService service)
        {
            _service = service;
        }

        [HttpGet("ficha/{fichaId}")]
        public async Task<IActionResult> GetPorFicha(int fichaId)
        {
            var unidades = await _service.ObtenerPorFichaAsync(fichaId);
            return Ok(unidades);
        }

        [HttpPost("{id}/escanear")]
        public async Task<IActionResult> Escanear(int id)
        {
            int? usuarioId = null;
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(claim, out var parsedId)) usuarioId = parsedId;

            var resultado = await _service.EscanearAsync(id, usuarioId);
            if (resultado == null) return NotFound(new { mensaje = "No se encontró ninguna prenda con ese código." });

            return Ok(resultado);
        }

        [HttpGet("resumen-orden/{ordenId}")]
        public async Task<IActionResult> GetResumenOrden(int ordenId)
        {
            var resumen = await _service.ObtenerResumenPorOrdenAsync(ordenId);
            if (resumen == null) return NotFound();
            return Ok(resumen);
        }
    }
}
