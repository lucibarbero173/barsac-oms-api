using BarsacOMS.Api.Models;
using BarsacOMS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarsacOMS.Api.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class ProveedorController : ControllerBase
    {
        private readonly IProveedorService _proveedorService;

        public ProveedorController(IProveedorService proveedorService)
        {
            _proveedorService = proveedorService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Proveedor>>> GetProveedores()
        {
            var proveedores = await _proveedorService.ObtenerProveedoresAsync();
            return Ok(proveedores);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Proveedor>> GetProveedor(int id)
        {
            var proveedor = await _proveedorService.ObtenerProveedorPorIdAsync(id);
            if (proveedor == null) return NotFound();
            return Ok(proveedor);
        }

        [HttpPost]
        public async Task<ActionResult<Proveedor>> PostProveedor([FromBody] Proveedor proveedor)
        {
            var nuevoProveedor = await _proveedorService.CrearProveedorAsync(proveedor);
            return CreatedAtAction(nameof(GetProveedor), new { id = nuevoProveedor.Id }, nuevoProveedor);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutProveedor(int id, [FromBody] Proveedor proveedor)
        {
            var resultado = await _proveedorService.ActualizarProveedorAsync(id, proveedor);
            if (!resultado) return BadRequest();
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProveedor(int id)
        {
            var resultado = await _proveedorService.EliminarProveedorAsync(id);
            if (!resultado) return NotFound();
            return NoContent();
        }
    }
}