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
                .OrderByDescending(c => c.FechaCobro)
                .ToListAsync();
        }

        public async Task<Cobro?> ObtenerPorIdAsync(int id)
        {
            return await _context.Cobros.FindAsync(id);
        }

        public async Task<Cobro> CrearCobroAsync(Cobro cobro)
        {
            _context.Cobros.Add(cobro);
            await _context.SaveChangesAsync();

            // Sumamos ESTE cobro a la orden (si está asociada), sin tocar nada más.
            if (cobro.OrdenId.HasValue)
            {
                await AplicarDeltaAOrdenAsync(cobro.OrdenId.Value, cobro.Concepto, cobro.Importe);
            }

            return cobro;
        }

        public async Task<bool> EliminarCobroAsync(int id)
        {
            var cobro = await _context.Cobros.FindAsync(id);
            if (cobro == null) return false;

            int? ordenId = cobro.OrdenId;
            var concepto = cobro.Concepto;
            var importe = cobro.Importe;

            _context.Cobros.Remove(cobro);
            await _context.SaveChangesAsync();

            // Restamos ESTE cobro de la orden, sin tocar el resto.
            if (ordenId.HasValue)
            {
                await AplicarDeltaAOrdenAsync(ordenId.Value, concepto, -importe);
            }

            return true;
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

        public async Task<bool> ActualizarCobroAsync(int id, Cobro cobro)
        {
            var cobroExistente = await _context.Cobros.FindAsync(id);
            if (cobroExistente == null) return false;

            int? ordenIdAnterior = cobroExistente.OrdenId;
            var conceptoAnterior = cobroExistente.Concepto;
            var importeAnterior = cobroExistente.Importe;

            // Actualizamos los datos
            cobroExistente.OrdenId = cobro.OrdenId;
            cobroExistente.FechaCobro = cobro.FechaCobro;
            cobroExistente.ClienteId = cobro.ClienteId;
            cobroExistente.NombreCliente = cobro.NombreCliente;
            cobroExistente.NombreOrdenante = cobro.NombreOrdenante;
            cobroExistente.Concepto = cobro.Concepto;
            cobroExistente.MedioCobro = cobro.MedioCobro;
            cobroExistente.Importe = cobro.Importe;

            await _context.SaveChangesAsync();

            // Deshacemos el efecto viejo en la orden de origen...
            if (ordenIdAnterior.HasValue)
            {
                await AplicarDeltaAOrdenAsync(ordenIdAnterior.Value, conceptoAnterior, -importeAnterior);
            }

            // ...y aplicamos el nuevo en la orden de destino (puede ser la misma).
            if (cobroExistente.OrdenId.HasValue)
            {
                await AplicarDeltaAOrdenAsync(cobroExistente.OrdenId.Value, cobroExistente.Concepto, cobroExistente.Importe);
            }

            return true;
        }
    }
}