using Microsoft.EntityFrameworkCore;
using BarsacOMS.Api.Data;
using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Models;

namespace BarsacOMS.Api.Services
{
    public class PagoService : IPagoService
    {
        private readonly AppDbContext _context;
        private readonly IPanelModistasService _panelModistas;

        public PagoService(AppDbContext context, IPanelModistasService panelModistas)
        {
            _context = context;
            _panelModistas = panelModistas;
        }

        public async Task<IEnumerable<Pago>> ObtenerTodosAsync()
        {
            var pagos = await _context.Pagos
                .OrderByDescending(p => p.FechaFactura)
                .ToListAsync();

            var liquidaciones = await _context.PagosModista
                .Where(pm => pm.PagoId != null)
                .Select(pm => new { PagoId = pm.PagoId!.Value, pm.Id, pm.CantidadPrendas })
                .ToListAsync();
            var porPago = liquidaciones.GroupBy(l => l.PagoId).ToDictionary(g => g.Key, g => g.First());

            foreach (var p in pagos)
            {
                if (porPago.TryGetValue(p.Id, out var l))
                {
                    p.PagoModistaId = l.Id;
                    p.CantidadPrendasModista = l.CantidadPrendas;
                }
            }
            return pagos;
        }

        public async Task<Pago?> ObtenerPorIdAsync(int id)
        {
            var pago = await _context.Pagos.FindAsync(id);
            if (pago == null) return null;

            var liquidacion = await BuscarLiquidacionAsync(id);
            pago.PagoModistaId = liquidacion?.Id;
            pago.CantidadPrendasModista = liquidacion?.CantidadPrendas;
            return pago;
        }

        public async Task<Pago> CrearAsync(CrearPagoDTO dto)
        {
            var pago = new Pago
            {
                FechaFactura = dto.FechaFactura,
                Proveedor = dto.Proveedor,
                Concepto = dto.Concepto,
                MedioPago = dto.MedioPago,
                Importe = dto.Importe,
                Estado = dto.Estado,
                FechaPago = dto.Estado == EstadoPago.PAGADO ? (dto.FechaPago ?? DateTime.Now) : null
            };

            _context.Pagos.Add(pago);
            await _context.SaveChangesAsync();
            return pago;
        }

        public async Task<(bool Encontrado, string? Error)> ActualizarAsync(int id, CrearPagoDTO dto)
        {
            var pago = await _context.Pagos.FindAsync(id);
            if (pago == null) return (false, null);

            // Un pago de modista tiene que seguir valiendo lo mismo que las prendas que liquidó
            var liquidacion = await BuscarLiquidacionAsync(id);
            if (liquidacion != null)
            {
                if (Math.Round(dto.Importe, 2) != Math.Round(pago.Importe, 2))
                    return (true, "Este pago es la liquidación de una modista: el importe tiene que coincidir con las prendas que se le pagaron. " +
                                  "Si hay que cambiarlo, anulalo (desde acá o desde Panel Modistas), ajustá el precio con el lápiz en \"A pagar\" y volvé a registrar el pago.");
                if (dto.Estado != EstadoPago.PAGADO)
                    return (true, "Este pago es la liquidación de una modista y ya se le pagó: no puede quedar PENDIENTE. Si no se le pagó, eliminalo.");
            }

            // Conciliado en Tesorería con otro importe, otra cuenta o que deja de estar pagado: deja de valer
            if (Math.Round(dto.Importe, 2) != Math.Round(pago.Importe, 2) || dto.MedioPago != pago.MedioPago || dto.Estado != pago.Estado)
                await TesoreriaService.DesconciliarAsync(_context, "Pago", id);

            pago.FechaFactura = dto.FechaFactura;
            pago.Proveedor = dto.Proveedor;
            pago.Concepto = dto.Concepto;
            pago.MedioPago = dto.MedioPago;
            pago.Importe = dto.Importe;
            pago.Estado = dto.Estado;
            pago.FechaPago = dto.Estado == EstadoPago.PAGADO ? (dto.FechaPago ?? DateTime.Now) : null;

            await _context.SaveChangesAsync();
            return (true, null);
        }

        public async Task<bool> EliminarAsync(int id)
        {
            var pago = await _context.Pagos.FindAsync(id);
            if (pago == null) return false;

            // Si es la liquidación de una modista, se anula también ahí: las prendas vuelven a
            // "A pagar" (lo mismo que anularlo desde Panel Modistas, que borra este Pago).
            var liquidacion = await BuscarLiquidacionAsync(id);
            if (liquidacion != null)
            {
                return await _panelModistas.AnularPagoAsync(liquidacion.Id);
            }

            await TesoreriaService.DesconciliarAsync(_context, "Pago", id);
            _context.Pagos.Remove(pago);
            await _context.SaveChangesAsync();
            return true;
        }

        private Task<PagoModista?> BuscarLiquidacionAsync(int pagoId) =>
            _context.PagosModista.FirstOrDefaultAsync(pm => pm.PagoId == pagoId);
    }
}
