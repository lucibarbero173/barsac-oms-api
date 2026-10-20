using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarsacOMS.Api.Controllers
{
    [Authorize(Roles = "admin")]
    [ApiController]
    [Route("api/[controller]")]
    public class ModistaController : ControllerBase
    {
        private readonly IModistaService _modistaService;

        public ModistaController(IModistaService modistaService)
        {
            _modistaService = modistaService;
        }

        // GET: api/Modista
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            return Ok(await _modistaService.ObtenerModistasAsync());
        }

        // POST: api/Modista
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] GuardarModistaDTO dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Nombre)) return BadRequest("El nombre es obligatorio.");
            return Ok(await _modistaService.CrearModistaAsync(dto));
        }

        // PUT: api/Modista/5
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] GuardarModistaDTO dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Nombre)) return BadRequest("El nombre es obligatorio.");
            var ok = await _modistaService.ActualizarModistaAsync(id, dto);
            if (!ok) return NotFound();
            return NoContent();
        }

        // GET: api/Modista/5/tarifas
        [HttpGet("{id}/tarifas")]
        public async Task<IActionResult> GetTarifas(int id)
        {
            var tarifas = await _modistaService.ObtenerTarifasAsync(id);
            if (tarifas == null) return NotFound();
            return Ok(tarifas);
        }

        // PUT: api/Modista/5/tarifas
        [HttpPut("{id}/tarifas")]
        public async Task<IActionResult> SaveTarifas(int id, [FromBody] List<GuardarTarifaDTO> tarifas)
        {
            if (tarifas.Any(t => t.Precio.HasValue && t.Precio.Value < 0))
                return BadRequest("Las tarifas no pueden ser negativas.");

            var ok = await _modistaService.GuardarTarifasAsync(id, tarifas);
            if (!ok) return NotFound();
            return NoContent();
        }
    }
}
