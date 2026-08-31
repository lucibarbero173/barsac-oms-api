using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarsacOMS.Api.Controllers
{
    [Authorize(Roles = "admin")]
    [Route("api/[controller]")]
    [ApiController]
    public class UsuariosController : ControllerBase
    {
        private readonly IUsuarioService _usuarioService;

        public UsuariosController(IUsuarioService usuarioService)
        {
            _usuarioService = usuarioService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<UsuarioDto>>> GetUsuarios()
        {
            var usuarios = await _usuarioService.ObtenerUsuariosAsync();
            return Ok(usuarios);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<UsuarioDto>> GetUsuario(int id)
        {
            var usuario = await _usuarioService.ObtenerUsuarioPorIdAsync(id);
            if (usuario == null) return NotFound();
            return Ok(usuario);
        }

        [HttpPost]
        public async Task<IActionResult> PostUsuario([FromBody] CrearUsuarioDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var (exito, mensaje, usuario) = await _usuarioService.CrearUsuarioAsync(dto);
            if (!exito) return BadRequest(new { mensaje });

            return CreatedAtAction(nameof(GetUsuario), new { id = usuario!.Id }, usuario);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutUsuario(int id, [FromBody] ActualizarUsuarioDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var (exito, mensaje) = await _usuarioService.ActualizarUsuarioAsync(id, dto);
            if (!exito) return BadRequest(new { mensaje });

            return Ok(new { mensaje });
        }
    }
}
