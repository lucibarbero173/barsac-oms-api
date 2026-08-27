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
            try
            {
                var productos = await _productoService.ObtenerProductosAsync();
                return Ok(productos);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, inner = ex.InnerException?.Message });
            }
        }

        [HttpGet("precio")]
        public async Task<IActionResult> GetPrecio([FromQuery] int productoId, [FromQuery] string talle, [FromQuery] string tipoPago)
        {
            try
            {
                var precio = await _productoService.ObtenerPrecioAsync(productoId, talle, tipoPago);
                return Ok(new { precio });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, inner = ex.InnerException?.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetProducto(int id)
        {
            try
            {
                var producto = await _productoService.ObtenerProductoPorIdAsync(id);
                if (producto == null) return NotFound();

                return Ok(producto);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, inner = ex.InnerException?.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> PostProducto([FromBody] GuardarProductoDTO dto)
        {
            try
            {
                // Validación de datos
                if (string.IsNullOrWhiteSpace(dto.Nombre))
                {
                    return BadRequest(new { error = "El nombre del producto es requerido" });
                }

                var productoCreado = await _productoService.CrearProductoAsync(dto);
                return CreatedAtAction(nameof(GetProducto), new { id = productoCreado.Id }, new { id = productoCreado.Id, mensaje = "Producto creado con éxito" });
            }
            catch (InvalidOperationException ex)
            {
                return StatusCode(500, new { error = "Error de conexión a la base de datos", details = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, inner = ex.InnerException?.Message, stackTrace = ex.StackTrace });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutProducto(int id, [FromBody] GuardarProductoDTO dto)
        {
            try
            {
                var exito = await _productoService.ActualizarProductoAsync(id, dto);
                if (!exito) return NotFound();

                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, inner = ex.InnerException?.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProducto(int id)
        {
            try
            {
                var exito = await _productoService.EliminarProductoAsync(id);
                if (!exito) return NotFound();

                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, inner = ex.InnerException?.Message });
            }
        }
    }
}