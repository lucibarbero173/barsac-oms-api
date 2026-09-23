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
                    .ThenInclude(i => i.Unidades)
                .Include(f => f.EntregasParciales)
                .ToListAsync();
        }

        public async Task<FichaProduccion?> GetByIdAsync(int id)
        {
            return await _context.FichasProduccion
                .Include(f => f.Orden)
                .Include(f => f.Items)
                    .ThenInclude(i => i.Unidades)
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

            // La ficha nueva arranca en Pendiente (EstadoFicha por defecto), así que la
            // orden tiene que reflejar eso YA, aunque ya tuviera otra ficha más avanzada
            // (o hasta ya entregada) — si se le agrega trabajo nuevo, deja de estar lista.
            await RecalcularEstadoOrdenAsync(ficha.OrdenId, ignorarEstadoActual: true);

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

            // Validar ANTES de tocar nada: no se puede borrar ni reducir por debajo de lo que ya
            // avanzó en cualquier etapa (Diseño, Corte o Control), para no perder trabajo hecho.
            static bool TieneAvance(PrendaUnidad u) => u.Controlada || u.DisenoListo || u.CorteEstado != EstadoCorte.Pendiente;

            var conflictos = new List<string>();

            foreach (var existente in aBorrar)
            {
                if (existente.Unidades.Any(TieneAvance))
                {
                    conflictos.Add($"La línea \"{existente.Producto} - talle {existente.Talle}\" ya tiene prendas con avance (Diseño/Corte/Control) y no puede eliminarse.");
                }
            }

            foreach (var existente in fichaExistente.Items)
            {
                if (!payloadPorId.TryGetValue(existente.Id, out var nuevo)) continue;

                int conAvance = existente.Unidades.Count(TieneAvance);
                if (nuevo.Cantidades < conAvance)
                {
                    conflictos.Add($"La línea \"{existente.Producto} - talle {existente.Talle}\" tiene {conAvance} prenda(s) con avance (Diseño/Corte/Control), no se puede bajar la cantidad a {nuevo.Cantidades}.");
                }
            }

            if (conflictos.Count > 0)
            {
                return new ResultadoActualizacionFicha { Exito = false, Conflictos = conflictos };
            }

            // Sin conflictos: aplicar cambios
            fichaExistente.Modista = ficha.Modista;
            fichaExistente.OrdenId = ficha.OrdenId;
            fichaExistente.ImagenDisenoBase64 = ficha.ImagenDisenoBase64;
            fichaExistente.EstadoFicha = ficha.EstadoFicha;

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
                        .Where(u => !TieneAvance(u))
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

            // Si se cambió el estado de la ficha a mano, la orden tiene que reflejarlo
            // (usando siempre la ficha más atrasada de todas las suyas).
            await RecalcularEstadoOrdenAsync(fichaExistente.OrdenId);

            return new ResultadoActualizacionFicha { Exito = true };
        }

        public async Task<List<OrdenTrabajo>> GetOrdenesConSaldoPendienteAsync()
        {
            var ordenes = await _context.Ordenes
                .Include(o => o.Detalles)
                    .ThenInclude(d => d.Producto)
                .ToListAsync();

            var fichas = await _context.FichasProduccion
                .Include(f => f.Items)
                .ToListAsync();

            var repartidoPorOrden = ConstruirMapaRepartidoPorOrden(fichas);

            return ordenes.Where(o =>
            {
                var mapa = repartidoPorOrden.GetValueOrDefault(o.Id) ?? new Dictionary<string, int>();
                var pedidoPorProducto = o.Detalles
                    .GroupBy(d => d.Producto?.Nombre ?? "")
                    .Select(g => new { Producto = g.Key, Cantidad = g.Sum(d => d.Cantidad) });

                return pedidoPorProducto.Any(p => p.Cantidad > mapa.GetValueOrDefault(p.Producto));
            }).ToList();
        }

        public async Task<DisponibilidadOrdenDto> ObtenerDisponibilidadAsync(int ordenId, int? excluirFichaId)
        {
            var orden = await _context.Ordenes
                .Include(o => o.Detalles)
                    .ThenInclude(d => d.Producto)
                .FirstOrDefaultAsync(o => o.Id == ordenId);

            if (orden == null) return new DisponibilidadOrdenDto();

            var todasLasFichas = await _context.FichasProduccion
                .Include(f => f.Items)
                .Where(f => f.OrdenId == ordenId)
                .ToListAsync();

            var fichasParaRepartir = excluirFichaId.HasValue
                ? todasLasFichas.Where(f => f.Id != excluirFichaId.Value)
                : todasLasFichas;

            // Se compara solo por producto: el "talle" del pedido es una categoría de precio
            // (ej. "NIÑO"/"ADULTO") que no tiene por qué coincidir con el talle real de
            // fabricación que se carga en la ficha (ej. "12", "14", "M").
            var repartido = new Dictionary<string, int>();
            foreach (var f in fichasParaRepartir)
            {
                foreach (var item in f.Items)
                {
                    repartido[item.Producto] = repartido.GetValueOrDefault(item.Producto) + item.Cantidades;
                }
            }

            var lineas = orden.Detalles
                .GroupBy(d => d.Producto?.Nombre ?? "")
                .Select(g =>
                {
                    var cantidadPedida = g.Sum(d => d.Cantidad);
                    var yaRepartido = repartido.GetValueOrDefault(g.Key);
                    return new DisponibilidadLineaDto
                    {
                        Producto = g.Key,
                        CantidadPedida = cantidadPedida,
                        CantidadRepartida = yaRepartido,
                        Disponible = Math.Max(0, cantidadPedida - yaRepartido)
                    };
                }).ToList();

            var fichasExistentes = todasLasFichas
                .Where(f => !excluirFichaId.HasValue || f.Id != excluirFichaId.Value)
                .Select(f => new FichaResumenSimpleDto
                {
                    FichaId = f.Id,
                    Modista = f.Modista,
                    Entregada = f.Entregada,
                    Lineas = f.Items
                        .Select(i => $"{i.Cantidades} {i.Producto}{(string.IsNullOrEmpty(i.Talle) ? "" : " talle " + i.Talle)}")
                        .ToList()
                }).ToList();

            return new DisponibilidadOrdenDto { Lineas = lineas, FichasExistentes = fichasExistentes };
        }

        public async Task<bool> MarcarEntregadaAsync(int fichaId)
        {
            var ficha = await _context.FichasProduccion.FindAsync(fichaId);
            if (ficha == null) return false;

            ficha.Entregada = true;
            ficha.FechaEntregaFicha = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var todasLasFichas = await _context.FichasProduccion
                .Where(f => f.OrdenId == ficha.OrdenId)
                .ToListAsync();

            var orden = await _context.Ordenes.FindAsync(ficha.OrdenId);
            if (orden != null)
            {
                orden.Estado = todasLasFichas.All(f => f.Entregada)
                    ? EstadoOrden.Entregado
                    : EstadoOrden.EntregadoParcial;
                await _context.SaveChangesAsync();
            }

            return true;
        }

        private static Dictionary<int, Dictionary<string, int>> ConstruirMapaRepartidoPorOrden(List<FichaProduccion> fichas)
        {
            var mapaPorOrden = new Dictionary<int, Dictionary<string, int>>();
            foreach (var f in fichas)
            {
                if (!mapaPorOrden.TryGetValue(f.OrdenId, out var mapa))
                {
                    mapa = new Dictionary<string, int>();
                    mapaPorOrden[f.OrdenId] = mapa;
                }
                foreach (var item in f.Items)
                {
                    mapa[item.Producto] = mapa.GetValueOrDefault(item.Producto) + item.Cantidades;
                }
            }
            return mapaPorOrden;
        }

        public async Task<FichaProduccion?> ObtenerFichaPorOrdenAsync(int ordenId)
        {
            return await _context.FichasProduccion
                .Include(f => f.Orden)
                .Include(f => f.Items)
                    .ThenInclude(i => i.Unidades)
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

        // Solo estos valores son estados de PRODUCCIÓN (los que puede tomar una ficha).
        private static readonly HashSet<EstadoOrden> EstadosDeProduccion = new()
        {
            EstadoOrden.Pendiente, EstadoOrden.EnProceso, EstadoOrden.Corte, EstadoOrden.CorteFaltantes, EstadoOrden.AptoConfeccion
        };

        // El estado de la ORDEN pasa a ser el de su ficha más atrasada: así nunca se ve
        // más avanzada de lo que en realidad está. ignorarEstadoActual=true se usa al
        // crear una ficha nueva, para que "des-entregue" una orden que ya se había dado
        // por lista/entregada si le agregan trabajo nuevo.
        private async Task RecalcularEstadoOrdenAsync(int ordenId, bool ignorarEstadoActual = false)
        {
            var orden = await _context.Ordenes.FindAsync(ordenId);
            if (orden == null) return;
            if (!ignorarEstadoActual && !EstadosDeProduccion.Contains(orden.Estado)) return;

            var fichas = await _context.FichasProduccion.Where(f => f.OrdenId == ordenId).ToListAsync();
            if (fichas.Count == 0) return;

            orden.Estado = (EstadoOrden)fichas.Min(f => (int)f.EstadoFicha);
            await _context.SaveChangesAsync();
        }
    }
}
