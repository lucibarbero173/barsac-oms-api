using BarsacOMS.Api.Data;
using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BarsacOMS.Api.Services
{
    public class ModistaService : IModistaService
    {
        private readonly AppDbContext _context;

        public ModistaService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<ModistaDTO>> ObtenerModistasAsync()
        {
            return await _context.Modistas
                .AsNoTracking()
                .OrderByDescending(m => m.Activa)
                .ThenBy(m => m.Nombre)
                .Select(m => new ModistaDTO
                {
                    Id = m.Id,
                    Nombre = m.Nombre,
                    Activa = m.Activa,
                    CantidadTarifas = m.Tarifas.Count
                })
                .ToListAsync();
        }

        public async Task<ModistaDTO> CrearModistaAsync(GuardarModistaDTO dto)
        {
            var modista = new Modista { Nombre = dto.Nombre.Trim(), Activa = dto.Activa };
            _context.Modistas.Add(modista);
            await _context.SaveChangesAsync();

            return new ModistaDTO { Id = modista.Id, Nombre = modista.Nombre, Activa = modista.Activa };
        }

        public async Task<bool> ActualizarModistaAsync(int id, GuardarModistaDTO dto)
        {
            var modista = await _context.Modistas.FindAsync(id);
            if (modista == null) return false;

            modista.Nombre = dto.Nombre.Trim();
            modista.Activa = dto.Activa;
            await _context.SaveChangesAsync();
            return true;
        }

        // Devuelve TODOS los productos del catálogo, con la tarifa de esta modista si la tiene,
        // para poder cargar/editar todas de una en la misma grilla.
        public async Task<List<TarifaModistaDTO>?> ObtenerTarifasAsync(int modistaId)
        {
            if (!await _context.Modistas.AnyAsync(m => m.Id == modistaId)) return null;

            var tarifas = await _context.TarifasModista
                .AsNoTracking()
                .Where(t => t.ModistaId == modistaId)
                .ToDictionaryAsync(t => t.ProductoId, t => t.Precio);

            var productos = await _context.Productos
                .AsNoTracking()
                .OrderBy(p => p.Nombre)
                .Select(p => new { p.Id, p.Nombre })
                .ToListAsync();

            return productos.Select(p => new TarifaModistaDTO
            {
                ProductoId = p.Id,
                ProductoNombre = p.Nombre,
                Precio = tarifas.TryGetValue(p.Id, out var precio) ? precio : null
            }).ToList();
        }

        // Guarda la grilla completa: precio cargado = alta/modificación, vacío = se borra la tarifa.
        // Los productos que no vienen en la lista no se tocan.
        public async Task<bool> GuardarTarifasAsync(int modistaId, List<GuardarTarifaDTO> tarifas)
        {
            if (!await _context.Modistas.AnyAsync(m => m.Id == modistaId)) return false;

            var existentes = await _context.TarifasModista
                .Where(t => t.ModistaId == modistaId)
                .ToDictionaryAsync(t => t.ProductoId);

            foreach (var t in tarifas)
            {
                existentes.TryGetValue(t.ProductoId, out var existente);

                if (t.Precio.HasValue)
                {
                    if (existente != null)
                    {
                        existente.Precio = t.Precio.Value;
                    }
                    else
                    {
                        _context.TarifasModista.Add(new TarifaModista
                        {
                            ModistaId = modistaId,
                            ProductoId = t.ProductoId,
                            Precio = t.Precio.Value
                        });
                    }
                }
                else if (existente != null)
                {
                    _context.TarifasModista.Remove(existente);
                }
            }

            await _context.SaveChangesAsync();
            return true;
        }
    }
}
