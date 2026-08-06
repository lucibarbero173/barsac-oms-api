using BarsacOMS.Api.Data;
using BarsacOMS.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BarsacOMS.Api.Services
{
    public class FichaProduccionService : IFichaProduccionService
    {
        private readonly AppDbContext _context;

        public FichaProduccionService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<FichaProduccion>> GetAllAsync()
        {
            return await _context.FichasProduccion
                .Include(f => f.Orden)
                .Include(f => f.Items)
                .Include(f => f.EntregasParciales) // <--- ¡Esta línea es la clave!
                .ToListAsync();
        }

        public async Task<FichaProduccion?> GetByIdAsync(int id)
        {
            return await _context.FichasProduccion
                .Include(f => f.Orden)
                .Include(f => f.Items)
                .Include(f => f.EntregasParciales) // <--- ¡Y aquí también!
                .FirstOrDefaultAsync(f => f.Id == id);
        }

        public async Task<FichaProduccion> CreateAsync(FichaProduccion ficha)
        {
            _context.FichasProduccion.Add(ficha);
            await _context.SaveChangesAsync();
            return ficha;
        }

        public async Task<bool> UpdateAsync(FichaProduccion ficha)
        {
            // Cargar la ficha existente junto a sus ítems actuales
            var fichaExistente = await _context.FichasProduccion
                .Include(f => f.Items)
                .FirstOrDefaultAsync(f => f.Id == ficha.Id);

            if (fichaExistente == null) return false;

            // Actualizar propiedades principales
            fichaExistente.Modista = ficha.Modista;
            fichaExistente.OrdenId = ficha.OrdenId;

            // Remover los ítems viejos y agregar los nuevos del payload
            _context.DetallesFichaProduccion.RemoveRange(fichaExistente.Items);
            fichaExistente.Items = ficha.Items;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<IEnumerable<OrdenTrabajo>> GetOrdenesSinFichaAsync()
        {
            var ordenesConFichaIds = await _context.FichasProduccion
                .Select(f => f.OrdenId)
                .ToListAsync();

            return await _context.Ordenes
                .Where(o => !ordenesConFichaIds.Contains(o.Id))
                .ToListAsync();
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var ficha = await _context.FichasProduccion.FindAsync(id);
            if (ficha == null) return false;

            _context.FichasProduccion.Remove(ficha);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}