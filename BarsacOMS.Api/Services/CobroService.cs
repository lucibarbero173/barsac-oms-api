using BarsacOMS.Api.Data;
using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Models;
using Microsoft.EntityFrameworkCore;
using BarsacOMS.Api.Services;

namespace BarsacOMS.Api.Services
{
    public class CobroService : ICobroService
    {
        private readonly AppDbContext _context;

        public CobroService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<Cobro>> ObtenerTodosAsync()
        {
            return await _context.Cobros
                .Include(c => c.Asignaciones)
                .OrderByDescending(c => c.FechaCobro)
                .ToListAsync();
        }

        public async Task<Cobro?> ObtenerPorIdAsync(int id)
        {
            return await _context.Cobros
                .Include(c => c.Asignaciones)
                .FirstOrDefaultAsync(c => c.Id == id);
        }

        // Si el cobro se reparte entre pedidos: montos positivos, sin pedidos repetidos, pedidos
        // que existan y que la suma dé exactamente el importe total. Null = está todo bien.
        public async Task<string?> ValidarAsignacionesAsync(Cobro cobro)
        {
            var asignaciones = cobro.Asignaciones ?? new List<CobroAsignacion>();
            if (asignaciones.Count == 0) return null;

            if (asignaciones.Any(a => a.Importe <= 0))
                return "Cada pedido del reparto tiene que tener un monto mayor a cero.";

            if (asignaciones.GroupBy(a => a.OrdenId).Any(g => g.Count() > 1))
                return "Hay un pedido repetido en el reparto.";

            var ids = asignaciones.Select(a => a.OrdenId).ToList();
            var existentes = await _context.Ordenes.Where(o => ids.Contains(o.Id)).Select(o => o.Id).ToListAsync();
            var faltante = ids.FirstOrDefault(id => !existentes.Contains(id));
            if (faltante != 0) return $"El pedido #{faltante} no existe.";

            var suma = Math.Round(asignaciones.Sum(a => a.Importe), 2);
            if (suma != Math.Round(cobro.Importe, 2))
                return $"El reparto suma ${suma:N2} y el cobro es de ${cobro.Importe:N2}. Tienen que coincidir.";

            return null;
        }

        public async Task<Cobro> CrearCobroAsync(Cobro cobro)
        {
            NormalizarReparto(cobro);

            _context.Cobros.Add(cobro);
            await _context.SaveChangesAsync();

            // Sumamos ESTE cobro a su(s) pedido(s), sin tocar nada más.
            await AplicarEfectoAsync(cobro.OrdenId, cobro.Asignaciones, cobro.Concepto, cobro.Importe, signo: 1);

            return cobro;
        }

        public async Task<bool> EliminarCobroAsync(int id)
        {
            var cobro = await ObtenerPorIdAsync(id);
            if (cobro == null) return false;

            var ordenId = cobro.OrdenId;
            var asignaciones = cobro.Asignaciones.Select(a => new CobroAsignacion { OrdenId = a.OrdenId, Importe = a.Importe }).ToList();
            var concepto = cobro.Concepto;
            var importe = cobro.Importe;

            _context.Cobros.Remove(cobro); // la cascada se lleva sus asignaciones
            await _context.SaveChangesAsync();

            // Restamos ESTE cobro de su(s) pedido(s), sin tocar el resto.
            await AplicarEfectoAsync(ordenId, asignaciones, concepto, importe, signo: -1);

            return true;
        }

        public async Task<bool> ActualizarCobroAsync(int id, Cobro cobro)
        {
            var cobroExistente = await ObtenerPorIdAsync(id);
            if (cobroExistente == null) return false;

            // Foto de cómo estaba, para deshacer su efecto en los pedidos
            var ordenIdAnterior = cobroExistente.OrdenId;
            var asignacionesAnteriores = cobroExistente.Asignaciones
                .Select(a => new CobroAsignacion { OrdenId = a.OrdenId, Importe = a.Importe }).ToList();
            var conceptoAnterior = cobroExistente.Concepto;
            var importeAnterior = cobroExistente.Importe;

            NormalizarReparto(cobro);

            // Actualizamos los datos
            cobroExistente.OrdenId = cobro.OrdenId;
            cobroExistente.FechaCobro = cobro.FechaCobro;
            cobroExistente.ClienteId = cobro.ClienteId;
            cobroExistente.NombreCliente = cobro.NombreCliente;
            cobroExistente.NombreOrdenante = cobro.NombreOrdenante;
            cobroExistente.Concepto = cobro.Concepto;
            cobroExistente.MedioCobro = cobro.MedioCobro;
            cobroExistente.Importe = cobro.Importe;

            _context.RemoveRange(cobroExistente.Asignaciones);
            cobroExistente.Asignaciones = cobro.Asignaciones
                .Select(a => new CobroAsignacion { OrdenId = a.OrdenId, Importe = a.Importe }).ToList();

            await _context.SaveChangesAsync();

            // Deshacemos el efecto viejo en los pedidos de origen...
            await AplicarEfectoAsync(ordenIdAnterior, asignacionesAnteriores, conceptoAnterior, importeAnterior, signo: -1);

            // ...y aplicamos el nuevo (pueden ser los mismos pedidos).
            await AplicarEfectoAsync(cobroExistente.OrdenId, cobroExistente.Asignaciones, cobroExistente.Concepto, cobroExistente.Importe, signo: 1);

            return true;
        }

        // Un reparto de un solo pedido es lo mismo que un cobro común: se guarda en OrdenId.
        // Con 2 o más pedidos, OrdenId queda en null y manda el reparto.
        private static void NormalizarReparto(Cobro cobro)
        {
            cobro.Asignaciones ??= new List<CobroAsignacion>();

            if (cobro.Asignaciones.Count == 1)
            {
                cobro.OrdenId = cobro.Asignaciones[0].OrdenId;
                cobro.Asignaciones = new List<CobroAsignacion>();
            }
            else if (cobro.Asignaciones.Count > 1)
            {
                cobro.OrdenId = null;
                foreach (var a in cobro.Asignaciones)
                {
                    a.Id = 0;
                    a.CobroId = 0;
                }
            }
        }

        // Suma (signo 1) o resta (signo -1) el cobro en cada pedido que le corresponde
        private async Task AplicarEfectoAsync(int? ordenId, IEnumerable<CobroAsignacion> asignaciones, string? concepto, decimal importe, int signo)
        {
            var lista = asignaciones.ToList();
            if (lista.Count > 0)
            {
                foreach (var a in lista)
                {
                    await AplicarDeltaAOrdenAsync(a.OrdenId, concepto, signo * a.Importe);
                }
            }
            else if (ordenId.HasValue)
            {
                await AplicarDeltaAOrdenAsync(ordenId.Value, concepto, signo * importe);
            }
        }

        // Suma (o resta, si delta es negativo) un importe puntual al campo que corresponda
        // de la orden (Seña si el concepto menciona "seña"/"refuerzo", si no Otros Cobros) y
        // recalcula el saldo. A propósito NO recalcula desde cero sumando toda la tabla de
        // Cobros: la orden puede tener una Seña/Otros Cobros cargada a mano al crear el
        // pedido (sin un Cobro asociado todavía), y recalcular desde cero la pisaba a 0.
        private async Task AplicarDeltaAOrdenAsync(int ordenId, string? concepto, decimal delta)
        {
            if (delta == 0) return;

            var orden = await _context.Ordenes.FindAsync(ordenId);
            if (orden == null) return;

            var c = (concepto ?? "").Trim().ToUpper();
            bool esSena = c.Contains("SEÑA") || c.Contains("SENA") || c.Contains("REFUERZO");

            if (esSena)
            {
                orden.Senas = (orden.Senas ?? 0m) + delta;
            }
            else
            {
                orden.OtrosCobros = (orden.OtrosCobros ?? 0m) + delta;
            }

            orden.Saldo = orden.ImporteTotal - (orden.Senas ?? 0m) - (orden.OtrosCobros ?? 0m);
            await _context.SaveChangesAsync();
        }
    }
}
