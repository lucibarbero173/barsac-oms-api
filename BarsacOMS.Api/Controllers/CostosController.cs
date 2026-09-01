using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Models;
using BarsacOMS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarsacOMS.Api.Controllers
{
    [Authorize(Roles = "admin")]
    [ApiController]
    [Route("api/[controller]")]
    public class CostosController : ControllerBase
    {
        private readonly ICostosService _costosService;

        public CostosController(ICostosService costosService)
        {
            _costosService = costosService;
        }

        [HttpGet]
        public async Task<IActionResult> GetTodos()
        {
            var costos = await _costosService.ObtenerTodosLosCostosAsync();
            return Ok(costos);
        }

        [HttpGet("{productoId}")]
        public async Task<IActionResult> GetPorProducto(int productoId)
        {
            var costo = await _costosService.ObtenerCostoPorProductoAsync(productoId);
            if (costo == null) return NotFound();
            return Ok(costo);
        }

        [HttpPut("{productoId}")]
        public async Task<IActionResult> PutPorProducto(int productoId, [FromBody] GuardarCostoProductoDto dto)
        {
            var costo = await _costosService.GuardarCostoProductoAsync(productoId, dto);
            if (costo == null) return NotFound();
            return Ok(costo);
        }

        [HttpGet("configuracion")]
        public async Task<IActionResult> GetConfiguracion()
        {
            return Ok(await _costosService.ObtenerConfiguracionAsync());
        }

        [HttpPut("configuracion")]
        public async Task<IActionResult> PutConfiguracion([FromBody] ConfiguracionCostos dto)
        {
            return Ok(await _costosService.ActualizarConfiguracionAsync(dto.ProduccionMensualEstimada));
        }

        [HttpGet("gastos-generales")]
        public async Task<IActionResult> GetGastosGenerales()
        {
            return Ok(await _costosService.ObtenerGastosGeneralesAsync());
        }

        [HttpPost("gastos-generales")]
        public async Task<IActionResult> PostGastoGeneral([FromBody] GastoGeneral gasto)
        {
            var creado = await _costosService.CrearGastoGeneralAsync(gasto);
            return CreatedAtAction(nameof(GetGastosGenerales), new { id = creado.Id }, creado);
        }

        [HttpPut("gastos-generales/{id}")]
        public async Task<IActionResult> PutGastoGeneral(int id, [FromBody] GastoGeneral gasto)
        {
            var exito = await _costosService.ActualizarGastoGeneralAsync(id, gasto);
            if (!exito) return NotFound();
            return NoContent();
        }

        [HttpDelete("gastos-generales/{id}")]
        public async Task<IActionResult> DeleteGastoGeneral(int id)
        {
            var exito = await _costosService.EliminarGastoGeneralAsync(id);
            if (!exito) return NotFound();
            return NoContent();
        }
    }
}
