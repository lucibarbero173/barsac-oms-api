using BarsacOMS.Api.Models;
using BarsacOMS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarsacOMS.Api.Controllers
{
    [Authorize(Roles = "admin,control")]
    [ApiController]
    [Route("api/[controller]")]
    public class FichaProduccionController : ControllerBase
    {
        private readonly IFichaProduccionService _fichaService;

        public FichaProduccionController(IFichaProduccionService fichaService)
        {
            _fichaService = fichaService;
        }

        // GET: api/FichaProduccion
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var fichas = await _fichaService.GetAllAsync();
            return Ok(fichas);
        }

        // GET: api/FichaProduccion/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var ficha = await _fichaService.GetByIdAsync(id);
            if (ficha == null) return NotFound();
            return Ok(ficha);
        }

        // POST: api/FichaProduccion
        [Authorize(Roles = "admin")]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] FichaProduccion ficha)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var nuevaFicha = await _fichaService.CreateAsync(ficha);
            return CreatedAtAction(nameof(GetById), new { id = nuevaFicha.Id }, nuevaFicha);
        }

        // PUT: api/FichaProduccion/5
        [Authorize(Roles = "admin")]
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] FichaProduccion ficha)
        {
            if (id != ficha.Id) return BadRequest("El ID no coincide");
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var resultado = await _fichaService.UpdateAsync(ficha);
            if (!resultado.Exito)
            {
                if (resultado.Conflictos.Count > 0) return Conflict(new { conflictos = resultado.Conflictos });
                return NotFound();
            }

            return NoContent();
        }

        // GET: api/FichaProduccion/sin-ficha
        [HttpGet("sin-ficha")]
        public async Task<IActionResult> GetOrdenesSinFicha()
        {
            var ordenes = await _fichaService.GetOrdenesSinFichaAsync();
            return Ok(ordenes);
        }

        // DELETE: api/FichaProduccion/5
        [Authorize(Roles = "admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var result = await _fichaService.DeleteAsync(id);
            if (!result) return NotFound();
            return NoContent();
        }
    }
}