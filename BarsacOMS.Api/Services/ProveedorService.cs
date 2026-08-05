using BarsacOMS.Api.Data;
using BarsacOMS.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BarsacOMS.Api.Services
{
    public class ProveedorService : IProveedorService
    {
        private readonly AppDbContext _context;

        public ProveedorService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Proveedor>> ObtenerProveedoresAsync()
        {
            return await _context.Proveedores.OrderBy(p => p.Nombre).ToListAsync();
        }

        public async Task<Proveedor?> ObtenerProveedorPorIdAsync(int id)
        {
            return await _context.Proveedores.FindAsync(id);
        }

        public async Task<Proveedor> CrearProveedorAsync(Proveedor proveedor)
        {
            try
            {
                _context.Proveedores.Add(proveedor);
                await _context.SaveChangesAsync();
                return proveedor;
            }
            catch (Exception ex)
            {
                // Esto te mostrará el error exacto de SQL o Entity Framework en los logs de Railway
                throw new Exception($"Error al guardar proveedor: {ex.Message} - Inner: {ex.InnerException?.Message}");
            }
        }

        public async Task<bool> ActualizarProveedorAsync(int id, Proveedor proveedor)
        {
            if (id != proveedor.Id) return false;
            _context.Entry(proveedor).State = EntityState.Modified;
            try
            {
                await _context.SaveChangesAsync();
                return true;
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Proveedores.Any(e => e.Id == id)) return false;
                throw;
            }
        }

        public async Task<bool> EliminarProveedorAsync(int id)
        {
            var proveedor = await _context.Proveedores.FindAsync(id);
            if (proveedor == null) return false;

            _context.Proveedores.Remove(proveedor);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}