using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Models;
using BarsacOMS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarsacOMS.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class OrdenController : ControllerBase
    {
        private readonly IOrdenService _ordenService;

        public OrdenController(IOrdenService ordenService)
        {
            _ordenService = ordenService;
        }

        [HttpPost]
        public async Task<IActionResult> CrearOrden([FromBody] CrearOrdenDTO dto)
        {
            try
            {
                var orden = await _ordenService.CrearOrdenAsync(dto);
                return Ok(orden);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> EditarOrden(int id, [FromBody] CrearOrdenDTO dto)
        {
            try
            {
                var orden = await _ordenService.EditarOrdenAsync(id, dto);
                if (orden == null) return NotFound("La orden no existe");

                return Ok(orden);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetOrden(int id)
        {
            var orden = await _ordenService.ObtenerOrdenPorIdAsync(id);
            if (orden == null) return NotFound();

            return Ok(orden);
        }

        [HttpGet]
        public async Task<IActionResult> GetOrdenes()
        {
            var ordenes = await _ordenService.ObtenerOrdenesAsync();
            return Ok(ordenes);
        }

        [HttpPut("{id}/estado")]
        public async Task<IActionResult> CambiarEstado(int id, [FromBody] EstadoOrden nuevoEstado)
        {
            var exito = await _ordenService.CambiarEstadoAsync(id, nuevoEstado);
            if (!exito) return NotFound();

            return Ok();
        }
    }

    [HttpDelete("{id}")]
        public async Task<IActionResult> EliminarOrden(int id)
        {
            try
            {
                var exito = await _ordenService.EliminarOrdenAsync(id); // O el método que use tu servicio para borrar
                if (!exito) return NotFound("La orden no existe");

                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }