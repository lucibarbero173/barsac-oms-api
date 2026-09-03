using System.Security.Claims;
using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarsacOMS.Api.Controllers
{
    // Sin restricción de Rol: cualquier usuario logueado (admin o control) edita su propio perfil.
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class PerfilController : ControllerBase
    {
        private readonly IPerfilService _perfilService;

        public PerfilController(IPerfilService perfilService)
        {
            _perfilService = perfilService;
        }

        private int ObtenerUsuarioIdActual()
        {
            var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.Parse(idClaim!);
        }

        [HttpGet("me")]
        public async Task<IActionResult> GetMe()
        {
            var perfil = await _perfilService.ObtenerPerfilAsync(ObtenerUsuarioIdActual());
            if (perfil == null) return NotFound();
            return Ok(perfil);
        }

        [HttpPut("me")]
        public async Task<IActionResult> PutMe([FromBody] ActualizarPerfilDto dto)
        {
            var (exito, error, perfil) = await _perfilService.ActualizarPerfilAsync(ObtenerUsuarioIdActual(), dto);
            if (!exito) return BadRequest(new { mensaje = error });
            return Ok(perfil);
        }
    }
}
