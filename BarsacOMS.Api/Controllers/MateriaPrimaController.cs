using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BarsacOMS.Api.Data;
using BarsacOMS.Api.Models;

[Route("api/[controller]")]
[ApiController]
public class MateriaPrimaController : ControllerBase
{
    private readonly AppDbContext _context;

    public MateriaPrimaController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<MateriaPrima>>> GetMateriasPrimas()
    {
        return await _context.MateriasPrimas
            .Include(mp => mp.Proveedor)
            .OrderBy(mp => mp.Nombre)
            .ToListAsync();
    }

    // Novedad: Endpoint filtrado en servidor para Telas
    [HttpGet("telas")]
    public async Task<ActionResult<IEnumerable<MateriaPrima>>> GetTelas()
    {
        return await _context.MateriasPrimas
            .Include(mp => mp.Proveedor)
            .Where(mp => mp.MetrosRindePorKilo != null)
            .OrderBy(mp => mp.Nombre)
            .ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<MateriaPrima>> GetMateriaPrima(int id)
    {
        var materiaPrima = await _context.MateriasPrimas
            .Include(mp => mp.Proveedor)
            .FirstOrDefaultAsync(mp => mp.Id == id);

        if (materiaPrima == null) return NotFound();

        return materiaPrima;
    }

    [HttpPost]
    public async Task<ActionResult<MateriaPrima>> PostMateriaPrima([FromBody] MateriaPrima materiaPrima)
    {
        _context.MateriasPrimas.Add(materiaPrima);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetMateriaPrima), new { id = materiaPrima.Id }, materiaPrima);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> PutMateriaPrima(int id, [FromBody] MateriaPrima materiaPrima)
    {
        if (id != materiaPrima.Id) return BadRequest();

        _context.Entry(materiaPrima).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!_context.MateriasPrimas.Any(e => e.Id == id)) return NotFound();
            throw;
        }

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteMateriaPrima(int id)
    {
        var materiaPrima = await _context.MateriasPrimas.FindAsync(id);
        if (materiaPrima == null) return NotFound();

        _context.MateriasPrimas.Remove(materiaPrima);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}