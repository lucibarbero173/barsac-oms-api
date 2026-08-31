using BarsacOMS.Api.Data;
using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BarsacOMS.Api.Services
{
    public class FichaProduccionService : IFichaProduccionService
    {
        private readonly AppDbContext _context;
        private readonly IPrendaUnidadService _prendaUnidadService;

        public FichaProduccionService(AppDbContext context, IPrendaUnidadService prendaUnidadService)
        {
            _context = context;
            _prendaUnidadService = prendaUnidadService;
        }

        public async Task<List<FichaProduccion>> GetAllAsync()
        {
            return await _context.FichasProduccion
                .Include(f => f.Orden)
                .Include(f => f.Items)
                .Include(f => f.EntregasParciales)
                .ToListAsync();
        }

        public async Task<FichaProduccion?> GetByIdAsync(int id)
        {
            return await _context.FichasProduccion
                .Include(f => f.Orden)
                .Include(f => f.Items)
                .Include(f => f.EntregasParciales)
                .FirstOrDefaultAsync(f => f.Id == id);
        }

        public async Task<FichaProduccion> CreateAsync(FichaProduccion ficha)
        {
            _context.FichasProduccion.Add(ficha);
            await _context.SaveChangesAsync(); // asigna Id a la ficha y a cada item de Items

            foreach (var item in ficha.Items)
            {
                await _prendaUnidadService.GenerarUnidadesAsync(item);
            }

            await _context.SaveChangesAsync();
            return ficha;
        }

        public async Task<ResultadoActualizacionFicha> UpdateAsync(FichaProduccion ficha)
        {
            var fichaExistente = await _context.FichasProduccion
                .Include(f => f.Items)
                    .ThenInclude(i => i.Unidades)
                .FirstOrDefaultAsync(f => f.Id == ficha.Id);

            if (fichaExistente == null)
            {
                return new ResultadoActualizacionFicha { Exito = false, NoEncontrada = true };
            }

            var payloadPorId = ficha.Items.Where(i => i.Id != 0).ToDictionary(i => i.Id);
            var payloadNuevos = ficha.Items.Where(i => i.Id == 0).ToList();
            var aBorrar = fichaExistente.Items.Where(existente => !payloadPorId.ContainsKey(existente.Id)).ToList();

            // Validar ANTES de tocar nada: no se puede borrar ni reducir por debajo de lo ya controlado
            var conflictos = new List<string>();

            foreach (var existente in aBorrar)
            {
                if (existente.Unidades.Any(u => u.Controlada))
                {
                    conflictos.Add($"La línea \"{existente.Producto} - talle {existente.Talle}\" ya tiene prendas controladas y no puede eliminarse.");
                }
            }

            foreach (var existente in fichaExistente.Items)
            {
                if (!payloadPorId.TryGetValue(existente.Id, out var nuevo)) continue;

                int controladas = existente.Unidades.Count(u => u.Controlada);
                if (nuevo.Cantidades < controladas)
                {
                    conflictos.Add($"La línea \"{existente.Producto} - talle {existente.Talle}\" tiene {controladas} prenda(s) ya controlada(s), no se puede bajar la cantidad a {nuevo.Cantidades}.");
                }
            }

            if (conflictos.Count > 0)
            {
                return new ResultadoActualizacionFicha { Exito = false, Conflictos = conflictos };
            }

            // Sin conflictos: aplicar cambios
            fichaExistente.Modista = ficha.Modista;
            fichaExistente.OrdenId = ficha.OrdenId;

            foreach (var existente in aBorrar)
            {
                _context.DetallesFichaProduccion.Remove(existente); // cascada se lleva sus Unidades (todas no controladas, ya validado)
            }

            foreach (var existente in fichaExistente.Items.Except(aBorrar))
            {
                var nuevo = payloadPorId[existente.Id];

                existente.Producto = nuevo.Producto;
                existente.Talle = nuevo.Talle;
                existente.Numero = nuevo.Numero;
                existente.Nombre = nuevo.Nombre;
                existente.Detalle = nuevo.Detalle;
                existente.Archivo = nuevo.Archivo;
                existente.Impresion = nuevo.Impresion;
                existente.Calandra = nuevo.Calandra;
                existente.Corte = nuevo.Corte;
                existente.Entregado = nuevo.Entregado;
                existente.FechaEntrega = nuevo.FechaEntrega;

                int delta = nuevo.Cantidades - existente.Unidades.Count;
                if (delta > 0)
                {
                    for (int i = 0; i < delta; i++)
                    {
                        _context.PrendasUnidad.Add(new PrendaUnidad { DetalleFichaProduccionId = existente.Id });
                    }
                }
                else if (delta < 0)
                {
                    var sobrantes = existente.Unidades
                        .Where(u => !u.Controlada)
                        .OrderByDescending(u => u.Id)
                        .Take(-delta)
                        .ToList();
                    _context.PrendasUnidad.RemoveRange(sobrantes);
                }

                existente.Cantidades = nuevo.Cantidades;
            }

            foreach (var nuevo in payloadNuevos)
            {
                nuevo.Id = 0;
                nuevo.FichaProduccionId = fichaExistente.Id;
                _context.DetallesFichaProduccion.Add(nuevo);
            }

            await _context.SaveChangesAsync(); // asigna Id a las líneas nuevas

            foreach (var nuevo in payloadNuevos)
            {
                await _prendaUnidadService.GenerarUnidadesAsync(nuevo);
            }

            await _context.SaveChangesAsync();

            return new ResultadoActualizacionFicha { Exito = true };
        }

        public async Task<List<OrdenTrabajo>> GetOrdenesSinFichaAsync()
        {
            var ordenesConFichaIds = await _context.FichasProduccion
                .Select(f => f.OrdenId)
                .ToListAsync();

            return await _context.Ordenes
                .Where(o => !ordenesConFichaIds.Contains(o.Id))
                .ToListAsync();
        }

        public async Task<FichaProduccion?> ObtenerFichaPorOrdenAsync(int ordenId)
        {
            return await _context.FichasProduccion
                .Include(f => f.Orden)
                .Include(f => f.Items)
                .Include(f => f.EntregasParciales)
                .FirstOrDefaultAsync(f => f.OrdenId == ordenId);
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
