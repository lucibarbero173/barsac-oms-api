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

        [HttpPut("fichas/{id}/imagen")]
        public async Task<IActionResult> PutImagen(int id, [FromBody] GuardarImagenDisenoDto dto)
        {
            var exito = await _disenoService.GuardarImagenAsync(id, dto.ImagenBase64);
            if (!exito) return NotFound();
            return NoContent();
        }

        [HttpDelete("fichas/{id}/imagen")]
        public async Task<IActionResult> DeleteImagen(int id)
        {
            var exito = await _disenoService.GuardarImagenAsync(id, null);
            if (!exito) return NotFound();
            return NoContent();
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

    public class GuardarImagenDisenoDto
    {
        public string? ImagenBase64 { get; set; }
    }
}
