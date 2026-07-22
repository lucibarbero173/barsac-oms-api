using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BarsacOMS.Api.Data;
using BarsacOMS.Api.Models;
using BarsacOMS.Api.Services;

[Route("api/[controller]")]
    [ApiController]
    public class CobrosController : ControllerBase
    {
        private readonly ICobroService _cobroService;

        public CobrosController(ICobroService cobroService)
        {
            _cobroService = cobroService;
        }

        [HttpGet]
        public async Task<IActionResult> Get()
        {
            var cobros = await _cobroService.ObtenerTodosAsync();
            return Ok(cobros);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var cobro = await _cobroService.ObtenerPorIdAsync(id);
            if (cobro == null) return NotFound();
            return Ok(cobro);
        }

        [HttpPost]
        public async Task<IActionResult> Post([FromBody] Cobro cobro)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var nuevoCobro = await _cobroService.CrearCobroAsync(cobro);
            return CreatedAtAction(nameof(GetById), new { id = nuevoCobro.Id }, nuevoCobro);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> ActualizarCobro(int id, [FromBody] Cobro cobro)
        {
            if (id != cobro.Id) return BadRequest("El ID del cobro no coincide");

            var actualizado = await _cobroService.ActualizarCobroAsync(id, cobro);
            if (!actualizado) return NotFound();

            return NoContent();
        }

    [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var resultado = await _cobroService.EliminarCobroAsync(id);
            if (!resultado) return NotFound();
            return NoContent();
        }
    }