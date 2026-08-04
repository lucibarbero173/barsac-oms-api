using BarsacOMS.Api.Models;
using BarsacOMS.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace BarsacOMS.Api.Controllers
{
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
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] FichaProduccion ficha)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var nuevaFicha = await _fichaService.CreateAsync(ficha);
            return CreatedAtAction(nameof(GetById), new { id = nuevaFicha.Id }, nuevaFicha);
        }

        // PUT: api/FichaProduccion/5
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] FichaProduccion ficha)
        {
            if (id != ficha.Id) return BadRequest("El ID no coincide");
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var updated = await _fichaService.UpdateAsync(ficha);
            if (!updated) return NotFound();

            return NoContent();
        }

        // DELETE: api/FichaProduccion/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var result = await _fichaService.DeleteAsync(id);
            if (!result) return NotFound();
            return NoContent();
        }
    }
}