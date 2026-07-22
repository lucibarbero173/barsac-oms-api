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

            // ⚡ RECALCULAR EL SALDO DE LA ORDEN SI ESTÁ ASOCIADA
            if (cobro.OrdenId.HasValue)
            {
                await RecalcularSaldoOrdenAsync(cobro.OrdenId.Value);
            }

            return cobro;
        }

        public async Task<bool> EliminarCobroAsync(int id)
        {
            var cobro = await _context.Cobros.FindAsync(id);
            if (cobro == null) return false;

            int? ordenId = cobro.OrdenId;

            _context.Cobros.Remove(cobro);
            await _context.SaveChangesAsync();

            // ⚡ RECALCULAR EL SALDO SI SE BORRA UN COBRO
            if (ordenId.HasValue)
            {
                await RecalcularSaldoOrdenAsync(ordenId.Value);
            }

            return true;
        }

        // Método privado para recalcular la orden separando por concepto
        private async Task RecalcularSaldoOrdenAsync(int ordenId)
        {
            var orden = await _context.Ordenes.FindAsync(ordenId);
            if (orden == null) return;

            // 1. Traemos todos los cobros asociados a la orden
            var cobros = await _context.Cobros
                .Where(c => c.OrdenId == ordenId)
                .ToListAsync();

            // 2. Sumamos las señas (Comprueba si el concepto CONTIENE "SEÑA" o "SENA", ignorando mayúsculas)
            decimal totalRefuerzoSenas = cobros
                .Where(c => !string.IsNullOrWhiteSpace(c.Concepto) &&
                           c.Concepto.Trim().ToUpper().Contains("SE") &&
                           (c.Concepto.Trim().ToUpper().Contains("A")))
                // O más directo:
                // .Where(c => !string.IsNullOrWhiteSpace(c.Concepto) && c.Concepto.ToUpper().Contains("SE") && c.Concepto.ToUpper().Contains("A"))
                .Sum(c => c.Importe);

            // Método más limpio y seguro para comparar strings:
            decimal totalSenas = 0m;
            decimal totalOtros = 0m;

            foreach (var c in cobros)
            {
                var concepto = (c.Concepto ?? "").Trim().ToUpper();
                if (concepto.Contains("SEÑA") || concepto.Contains("SENA") || concepto.Contains("REFUERZO"))
                {
                    totalSenas += c.Importe;
                }
                else
                {
                    totalOtros += c.Importe;
                }
            }

            // 3. Asignamos los valores recalculados
            orden.Senas = totalSenas;
            orden.OtrosCobros = totalOtros;

            // 4. Saldo final
            orden.Saldo = orden.ImporteTotal - (orden.Senas ?? 0m) - (orden.OtrosCobros ?? 0m);

            _context.Ordenes.Update(orden);
            await _context.SaveChangesAsync();
        }

        public async Task<bool> ActualizarCobroAsync(int id, Cobro cobro)
        {
            var cobroExistente = await _context.Cobros.FindAsync(id);
            if (cobroExistente == null) return false;

            int? ordenIdAnterior = cobroExistente.OrdenId;

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

            // ⚡ RECALCULAR LA ORDEN ACTUAL
            if (cobroExistente.OrdenId.HasValue)
            {
                await RecalcularSaldoOrdenAsync(cobroExistente.OrdenId.Value);
            }

            // Si cambió de número de orden, recalculamos la anterior también
            if (ordenIdAnterior.HasValue && ordenIdAnterior != cobroExistente.OrdenId)
            {
                await RecalcularSaldoOrdenAsync(ordenIdAnterior.Value);
            }

            return true;
        }
    }
}