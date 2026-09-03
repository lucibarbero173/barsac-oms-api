using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarsacOMS.Api.Controllers
{
    [Authorize(Roles = "admin")]
    [ApiController]
    [Route("api/[controller]")]
    public class ConciliacionController : ControllerBase
    {
        private readonly IConciliacionService _conciliacionService;

        public ConciliacionController(IConciliacionService conciliacionService)
        {
            _conciliacionService = conciliacionService;
        }

        [HttpGet("cuentas")]
        public IActionResult GetCuentas()
        {
            return Ok(_conciliacionService.ObtenerCuentas());
        }

        [HttpGet("resumen")]
        public async Task<IActionResult> GetResumen()
        {
            return Ok(await _conciliacionService.ObtenerResumenCuentasAsync());
        }

        [HttpGet("{cuenta}/libro")]
        public async Task<IActionResult> GetLibro(string cuenta)
        {
            return Ok(await _conciliacionService.ObtenerLibroAsync(cuenta));
        }

        [HttpGet("{cuenta}/saldo-inicial")]
        public async Task<IActionResult> GetSaldoInicial(string cuenta)
        {
            return Ok(await _conciliacionService.ObtenerSaldoInicialAsync(cuenta));
        }

        [HttpPut("{cuenta}/saldo-inicial")]
        public async Task<IActionResult> PutSaldoInicial(string cuenta, [FromBody] GuardarSaldoInicialDto dto)
        {
            return Ok(await _conciliacionService.GuardarSaldoInicialAsync(cuenta, dto));
        }

        [HttpPost("movimientos-manuales")]
        public async Task<IActionResult> PostMovimientoManual([FromBody] GuardarMovimientoManualDto dto)
        {
            var creado = await _conciliacionService.CrearMovimientoManualAsync(dto);
            return CreatedAtAction(nameof(GetLibro), new { cuenta = creado.Cuenta }, creado);
        }

        [HttpPut("movimientos-manuales/{id}")]
        public async Task<IActionResult> PutMovimientoManual(int id, [FromBody] GuardarMovimientoManualDto dto)
        {
            var exito = await _conciliacionService.ActualizarMovimientoManualAsync(id, dto);
            if (!exito) return NotFound();
            return NoContent();
        }

        [HttpDelete("movimientos-manuales/{id}")]
        public async Task<IActionResult> DeleteMovimientoManual(int id)
        {
            var exito = await _conciliacionService.EliminarMovimientoManualAsync(id);
            if (!exito) return NotFound();
            return NoContent();
        }
    }
}
