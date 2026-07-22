using Microsoft.EntityFrameworkCore;
using BarsacOMS.Api.Data;
using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Models;

namespace BarsacOMS.Api.Services
{
    public class PagoService : IPagoService
    {
        private readonly AppDbContext _context;

        public PagoService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Pago>> ObtenerTodosAsync()
        {
            return await _context.Pagos
                .OrderByDescending(p => p.FechaFactura)
                .ToListAsync();
        }

        public async Task<Pago?> ObtenerPorIdAsync(int id)
        {
            return await _context.Pagos.FindAsync(id);
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

        public async Task<bool> ActualizarAsync(int id, CrearPagoDTO dto)
        {
            var pago = await _context.Pagos.FindAsync(id);
            if (pago == null) return false;

            pago.FechaFactura = dto.FechaFactura;
            pago.Proveedor = dto.Proveedor;
            pago.Concepto = dto.Concepto;
            pago.MedioPago = dto.MedioPago;
            pago.Importe = dto.Importe;
            pago.Estado = dto.Estado;
            pago.FechaPago = dto.Estado == EstadoPago.PAGADO ? (dto.FechaPago ?? DateTime.Now) : null;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> EliminarAsync(int id)
        {
            var pago = await _context.Pagos.FindAsync(id);
            if (pago == null) return false;

            _context.Pagos.Remove(pago);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}