using BarsacOMS.Api.Data;
using BarsacOMS.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BarsacOMS.Api.Controllers
{
    [Authorize(Roles = "admin,super,gestion")]
    [ApiController]
    [Route("api/[controller]")]
    public class ClienteController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ClienteController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> Get()
        {
            var clientes = await _context.Clientes.ToListAsync();
            return Ok(clientes);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var cliente = await _context.Clientes.FindAsync(id);

            if (cliente == null)
                return NotFound();

            return Ok(cliente);
        }

        [HttpPost]
        public async Task<IActionResult> Create(Cliente cliente)
        {
            _context.Clientes.Add(cliente);
            await _context.SaveChangesAsync();
            return Ok(cliente);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, Cliente cliente)
        {
            if (id != cliente.Id)
                return BadRequest();

            _context.Entry(cliente).State = EntityState.Modified;

            // Los pedidos guardan una copia de los datos del cliente: se actualiza para que en
            // Pedidos, Fichas, Impresión, Cobros, etc. aparezca con el nombre y contacto de hoy.
            // La lista de precios no se toca: los precios de cada pedido ya quedaron cargados.
            var pedidos = await _context.Ordenes.Where(o => o.ClienteId == id).ToListAsync();
            foreach (var o in pedidos)
            {
                o.NombreCliente = cliente.Nombre ?? "";
                o.Telefono = cliente.Telefono ?? "";
                o.Solicitante = cliente.Solicitante ?? "";
                o.Disciplina = cliente.Disciplina ?? "";
            }

            var idsPedidos = pedidos.Select(o => o.Id).ToList();
            var cobros = await _context.Cobros
                .Where(c => c.ClienteId == id || (c.OrdenId != null && idsPedidos.Contains(c.OrdenId.Value)))
                .ToListAsync();
            cobros.ForEach(c => c.NombreCliente = cliente.Nombre);

            await _context.SaveChangesAsync();

            return Ok(cliente);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var cliente = await _context.Clientes.FindAsync(id);

            if (cliente == null)
                return NotFound();

            // Borrar el cliente borra en cascada todos sus pedidos, fichas y prendas
            var pedidos = await _context.Ordenes.CountAsync(o => o.ClienteId == id);
            if (pedidos > 0)
                return BadRequest($"No se puede eliminar a {cliente.Nombre}: tiene {pedidos} pedido(s) cargado(s). " +
                                  "Si se borra, se borran también sus pedidos, fichas y prendas.");

            _context.Clientes.Remove(cliente);
            await _context.SaveChangesAsync();

            return Ok();
        }
    }
}