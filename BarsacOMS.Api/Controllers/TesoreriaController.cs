using System.Security.Claims;
using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarsacOMS.Api.Controllers
{
    [Authorize(Roles = "super")]
    [ApiController]
    [Route("api/[controller]")]
    public class TesoreriaController : ControllerBase
    {
        private readonly ITesoreriaService _tesoreria;

        public TesoreriaController(ITesoreriaService tesoreria)
        {
            _tesoreria = tesoreria;
        }

        private int? UsuarioId()
        {
            var id = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(id, out var n) ? n : null;
        }

        [HttpGet("resumen")]
        public async Task<IActionResult> GetResumen() => Ok(await _tesoreria.ObtenerResumenAsync());

        [HttpGet("{cuenta}/movimientos")]
        public async Task<IActionResult> GetMovimientos(string cuenta, [FromQuery] DateTime? desde, [FromQuery] DateTime? hasta)
        {
            if (!_tesoreria.CuentaValida(cuenta)) return NotFound("Cuenta inexistente.");
            return Ok(await _tesoreria.ObtenerMovimientosAsync(cuenta, desde, hasta));
        }

        [HttpGet("{cuenta}/grafico")]
        public async Task<IActionResult> GetGrafico(string cuenta)
        {
            if (!_tesoreria.CuentaValida(cuenta)) return NotFound("Cuenta inexistente.");
            return Ok(await _tesoreria.ObtenerGraficoAsync(cuenta));
        }

        [HttpGet("{cuenta}/conciliar")]
        public async Task<IActionResult> GetConciliar(string cuenta, [FromQuery] DateTime? desde, [FromQuery] DateTime? hasta)
        {
            if (!_tesoreria.CuentaValida(cuenta)) return NotFound("Cuenta inexistente.");
            return Ok(await _tesoreria.ObtenerPantallaConciliarAsync(cuenta, desde, hasta));
        }

        [HttpPost("{cuenta}/extracto")]
        public async Task<IActionResult> CargarExtracto(string cuenta, [FromBody] CargarExtractoDto dto)
        {
            if (!_tesoreria.CuentaValida(cuenta)) return NotFound("Cuenta inexistente.");
            var (resultado, error) = await _tesoreria.CargarExtractoAsync(cuenta, dto);
            if (error != null) return BadRequest(error);
            return Ok(resultado);
        }

        [HttpPost("{cuenta}/extracto/eliminar")]
        public async Task<IActionResult> EliminarExtracto(string cuenta, [FromBody] EliminarExtractoDto dto)
        {
            if (!_tesoreria.CuentaValida(cuenta)) return NotFound("Cuenta inexistente.");
            var (eliminados, error) = await _tesoreria.EliminarExtractoAsync(cuenta, dto.Ids ?? new());
            if (error != null) return BadRequest(error);
            return Ok(new { eliminados });
        }

        [HttpPost("{cuenta}/extracto/{id}/crear-movimiento")]
        public async Task<IActionResult> CrearMovimiento(string cuenta, int id, [FromQuery] string? concepto)
        {
            if (!_tesoreria.CuentaValida(cuenta)) return NotFound("Cuenta inexistente.");
            var error = await _tesoreria.CrearMovimientoDesdeExtractoAsync(cuenta, id, concepto, UsuarioId());
            if (error != null) return BadRequest(error);
            return NoContent();
        }

        [HttpPost("{cuenta}/conciliar")]
        public async Task<IActionResult> Conciliar(string cuenta, [FromBody] ConciliarDto dto)
        {
            if (!_tesoreria.CuentaValida(cuenta)) return NotFound("Cuenta inexistente.");
            var (id, error) = await _tesoreria.ConciliarAsync(cuenta, dto, UsuarioId());
            if (error != null) return BadRequest(error);
            return Ok(new { id });
        }

        [HttpPost("{cuenta}/conciliar-automatico")]
        public async Task<IActionResult> ConciliarAutomatico(string cuenta)
        {
            if (!_tesoreria.CuentaValida(cuenta)) return NotFound("Cuenta inexistente.");
            var cantidad = await _tesoreria.ConciliarAutomaticoAsync(cuenta, UsuarioId());
            return Ok(new { cantidad });
        }

        [HttpDelete("conciliaciones/{id}")]
        public async Task<IActionResult> Deshacer(int id)
        {
            var ok = await _tesoreria.DeshacerConciliacionAsync(id);
            if (!ok) return NotFound();
            return NoContent();
        }
    }
}
