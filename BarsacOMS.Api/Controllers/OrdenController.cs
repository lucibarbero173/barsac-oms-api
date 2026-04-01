using BarsacOMS.Api.Data;
using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/[controller]")]
public class OrdenController : ControllerBase
{
    private readonly AppDbContext _context;

    public OrdenController(AppDbContext context)
    {
        _context = context;
    }

    [HttpPost]
    public async Task<IActionResult> CrearOrden(CrearOrdenDTO dto)
    {
        var orden = new OrdenTrabajo
        {
            ClienteId = dto.ClienteId,
            FechaPedido = dto.FechaPedido,
            FechaEntrega = dto.FechaEntrega,
            Estado = dto.Estado,
            Detalles = dto.Detalles.Select(d => new DetallePedido
            {
                Tela = d.Tela,
                Producto = d.Producto,
                Talle = d.Talle,
                Numero = d.Numero,
                Nombre = d.Nombre,
                Imagen = d.Imagen
            }).ToList()
        };

        _context.Ordenes.Add(orden);
        await _context.SaveChangesAsync();

        return Ok(orden);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetOrden(int id)
    {
        var orden = await _context.Ordenes
            .Include(o => o.Cliente)
            .Include(o => o.Detalles)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (orden == null)
            return NotFound();

        return Ok(orden);
    }

    [HttpPut("{id}/estado")]
    public async Task<IActionResult> CambiarEstado(int id, [FromBody] string nuevoEstado)
    {
        var orden = await _context.Ordenes.FindAsync(id);

        if (orden == null)
            return NotFound();

        orden.Estado = nuevoEstado;

        await _context.SaveChangesAsync();

        return Ok(orden);
    }

    [HttpPut("detalle/{id}")]
    public async Task<IActionResult> EditarDetalle(int id, EditarDetalleDTO dto)
    {
        var detalle = await _context.Detalles.FindAsync(id);

        if (detalle == null)
            return NotFound("Detalle no encontrado");

        detalle.Tela = dto.Tela;
        detalle.Producto = dto.Producto;
        detalle.Talle = dto.Talle;
        detalle.Numero = dto.Numero;
        detalle.Nombre = dto.Nombre;
        detalle.Imagen = dto.Imagen;

        await _context.SaveChangesAsync();

        return Ok(detalle);
    }

    [HttpDelete("detalle/{id}")]
    public async Task<IActionResult> EliminarDetalle(int id)
    {
        var detalle = await _context.Detalles.FindAsync(id);

        if (detalle == null)
            return NotFound();

        _context.Detalles.Remove(detalle);
        await _context.SaveChangesAsync();

        return Ok("Eliminado");
    }

    [HttpPost("{ordenId}/detalle")]
    public async Task<IActionResult> AgregarDetalle(int ordenId, [FromBody] CrearDetalleDTO dto)
    {
        var detalle = new DetallePedido
        {
            OrdenId = ordenId,
            Tela = dto.Tela,
            Producto = dto.Producto,
            Talle = dto.Talle,
            Numero = dto.Numero,
            Nombre = dto.Nombre,
            Imagen = dto.Imagen
        };

        _context.Detalles.Add(detalle);
        await _context.SaveChangesAsync();

        return Ok(detalle);
    }
}