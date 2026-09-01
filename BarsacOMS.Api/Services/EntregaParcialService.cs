using BarsacOMS.Api.Data;
using BarsacOMS.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BarsacOMS.Api.Services
{
    public class EntregaParcialService : IEntregaParcialService
    {
        private readonly AppDbContext _context;

        public EntregaParcialService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<EntregaParcial>> ObtenerPorFichaAsync(int fichaId)
        {
            return await _context.EntregasParciales
                .Where(e => e.FichaProduccionId == fichaId)
                .ToListAsync();
        }

        public async Task<bool> RegistrarEntregaParcialAsync(int fichaId, List<EntregaParcial> nuevasEntregas)
        {
            var ficha = await _context.FichasProduccion
                .Include(f => f.Orden)
                .Include(f => f.Items) // Items originales de la ficha
                .Include(f => f.EntregasParciales) // Entregas parciales históricas
                .FirstOrDefaultAsync(f => f.Id == fichaId);

            if (ficha == null) return false;

            // 1. Acumular o registrar las nuevas cantidades entregadas (agrupando por Producto y Talle)
            foreach (var nueva in nuevasEntregas)
            {
                var existente = ficha.EntregasParciales.FirstOrDefault(e =>
                    e.Producto == nueva.Producto &&
                    string.Equals(e.Talle ?? string.Empty, nueva.Talle ?? string.Empty, StringComparison.OrdinalIgnoreCase));

                if (existente != null)
                {
                    existente.Cantidades += nueva.Cantidades;
                    existente.FechaEntrega = DateTime.UtcNow;
                }
                else
                {
                    nueva.FichaProduccionId = fichaId;
                    _context.EntregasParciales.Add(nueva);
                    // Aseguramos que la colección en memoria también lo tenga para la validación posterior
                    ficha.EntregasParciales.Add(nueva);
                }
            }

            await _context.SaveChangesAsync();

            // 2. Verificar si se completó todo (comparando original vs entregado acumulado por Producto y Talle)
            bool todoEntregado = true;

            foreach (var itemOriginal in ficha.Items)
            {
                int totalEntregadoAcumulado = ficha.EntregasParciales
                    .Where(e => e.Producto == itemOriginal.Producto &&
                                string.Equals(e.Talle ?? string.Empty, itemOriginal.Talle ?? string.Empty, StringComparison.OrdinalIgnoreCase))
                    .Sum(e => e.Cantidades);

                if (totalEntregadoAcumulado < itemOriginal.Cantidades)
                {
                    todoEntregado = false;
                    break;
                }
            }

            // 3. Actualizar el estado de la Orden usando los valores del Enum EstadoOrden
            if (ficha.Orden != null)
            {
                if (todoEntregado)
                {
                    ficha.Orden.Estado = EstadoOrden.Entregado; // Valor 2
                }
                else
                {
                    ficha.Orden.Estado = EstadoOrden.EntregadoParcial; // Valor 4
                }
            }

            await _context.SaveChangesAsync();
            return true;
        }
    }
}