using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Models;

namespace BarsacOMS.Api.Services
{
    public interface IPagoService
    {
        Task<IEnumerable<Pago>> ObtenerTodosAsync();
        Task<Pago?> ObtenerPorIdAsync(int id);
        Task<Pago> CrearAsync(CrearPagoDTO dto);
        Task<bool> ActualizarAsync(int id, CrearPagoDTO dto);
        Task<bool> EliminarAsync(int id);
    }
}