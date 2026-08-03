using BarsacOMS.Api.Data;
using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace BarsacOMS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var resultado = await _authService.RegistrarUsuarioAsync(dto);

            if (!resultado.Exito)
            {
                return BadRequest(new { mensaje = resultado.Mensaje });
            }

            return Ok(new { mensaje = resultado.Mensaje });
        }
    }
}