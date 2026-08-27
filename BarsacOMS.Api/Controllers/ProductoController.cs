using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarsacOMS.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class ProductoController : ControllerBase
    {
        private readonly IProductoService _productoService;

        public ProductoController(IProductoService productoService)
        {
            _productoService = productoService;
        }

        [HttpGet]
        public async Task<IActionResult> GetProductos()
        {
            var productos = await _productoService.ObtenerProductosAsync();
            return Ok(productos);
        }

        [HttpGet("precio")]
        public async Task<IActionResult> GetPrecio([FromQuery] int productoId, [FromQuery] string talle, [FromQuery] string tipoPago)
        {
            var precio = await _productoService.ObtenerPrecioAsync(productoId, talle, tipoPago);
            return Ok(new { precio });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetProducto(int id)
        {
            var producto = await _productoService.ObtenerProductoPorIdAsync(id);
            if (producto == null) return NotFound();

            return Ok(producto);
        }

        [HttpPost]
        public async Task<IActionResult> PostProducto([FromBody] GuardarProductoDTO dto)
        {
            try
            {
                var productoCreado = await _productoService.CrearProductoAsync(dto);
                return Ok(new { id = productoCreado.Id, mensaje = "Producto creado con éxito" });
            }
            catch (Exception ex)
            {
                // Esto te devolverá el error real en la respuesta HTTP en lugar de un 500 genérico
                return StatusCode(500, new { error = ex.Message, inner = ex.InnerException?.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutProducto(int id, [FromBody] GuardarProductoDTO dto)
        {
            var exito = await _productoService.ActualizarProductoAsync(id, dto);
            if (!exito) return NotFound();

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProducto(int id)
        {
            var exito = await _productoService.EliminarProductoAsync(id);
            if (!exito) return NotFound();

            return NoContent();
        }
    }
}