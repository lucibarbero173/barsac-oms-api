using System.Security.Claims;
using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarsacOMS.Api.Controllers
{
    // Todo lo de acá es siempre de la modista logueada: el Id sale del token, nunca del request.
    [Authorize(Roles = "modista")]
    [ApiController]
    [Route("api/[controller]")]
    public class MisPrendasController : ControllerBase
    {
        private readonly IMisPrendasService _misPrendasService;

        public MisPrendasController(IMisPrendasService misPrendasService)
        {
            _misPrendasService = misPrendasService;
        }

        private async Task<int?> ObtenerModistaIdActualAsync()
        {
            var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(idClaim, out var usuarioId)) return null;
            return await _misPrendasService.ObtenerModistaIdAsync(usuarioId);
        }

        // GET: api/MisPrendas/fichas?terminadas=false
        [HttpGet("fichas")]
        public async Task<IActionResult> GetFichas([FromQuery] bool terminadas = false)
        {
            var modistaId = await ObtenerModistaIdActualAsync();
            if (modistaId == null) return BadRequest("Tu usuario no está vinculado a ninguna modista.");

            return Ok(await _misPrendasService.ObtenerFichasAsync(modistaId.Value, terminadas));
        }

        // GET: api/MisPrendas/fichas/5/imagen
        [HttpGet("fichas/{id}/imagen")]
        public async Task<IActionResult> GetImagen(int id)
        {
            var modistaId = await ObtenerModistaIdActualAsync();
            if (modistaId == null) return BadRequest("Tu usuario no está vinculado a ninguna modista.");

            var imagen = await _misPrendasService.ObtenerImagenAsync(modistaId.Value, id);
            if (string.IsNullOrEmpty(imagen)) return NotFound();
            return Ok(new { imagenDisenoBase64 = imagen });
        }

        // PUT: api/MisPrendas/renglon/12
        [HttpPut("renglon/{detalleId}")]
        public async Task<IActionResult> MarcarCosidas(int detalleId, [FromBody] MarcarCosidasDto dto)
        {
            var modistaId = await ObtenerModistaIdActualAsync();
            if (modistaId == null) return BadRequest("Tu usuario no está vinculado a ninguna modista.");

            var (exito, error) = await _misPrendasService.MarcarCosidasAsync(modistaId.Value, detalleId, dto.Cosidas);
            if (!exito) return BadRequest(error);
            return NoContent();
        }
    }
}
