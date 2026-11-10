using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Models;
using BarsacOMS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarsacOMS.Api.Controllers
{
    [Authorize(Roles = "super")]
    [ApiController]
    [Route("api/[controller]")]
    public class PagoController : ControllerBase
    {
        private readonly IPagoService _pagoService;

        public PagoController(IPagoService pagoService)
        {
            _pagoService = pagoService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Pago>>> GetTodos()
        {
            var pagos = await _pagoService.ObtenerTodosAsync();
            return Ok(pagos);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Pago>> GetPorId(int id)
        {
            var pago = await _pagoService.ObtenerPorIdAsync(id);
            if (pago == null) return NotFound(new { mensaje = "Pago no encontrado" });
            return Ok(pago);
        }

        [HttpPost]
        public async Task<ActionResult<Pago>> Crear([FromBody] CrearPagoDTO dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var nuevoPago = await _pagoService.CrearAsync(dto);
            return CreatedAtAction(nameof(GetPorId), new { id = nuevoPago.Id }, nuevoPago);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Actualizar(int id, [FromBody] CrearPagoDTO dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var (encontrado, error) = await _pagoService.ActualizarAsync(id, dto);
            if (!encontrado) return NotFound(new { mensaje = "Pago no encontrado" });
            if (error != null) return BadRequest(new { mensaje = error });

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Eliminar(int id)
        {
            var eliminado = await _pagoService.EliminarAsync(id);
            if (!eliminado) return NotFound(new { mensaje = "Pago no encontrado" });

            return NoContent();
        }
    }

}