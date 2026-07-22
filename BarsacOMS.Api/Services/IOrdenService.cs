using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Models;

namespace BarsacOMS.Api.Services
{
    public interface IOrdenService
    {
        Task<OrdenTrabajo> CrearOrdenAsync(CrearOrdenDTO dto);
        Task<OrdenTrabajo?> EditarOrdenAsync(int id, CrearOrdenDTO dto);
        Task<OrdenTrabajo?> ObtenerOrdenPorIdAsync(int id);
        Task<IEnumerable<OrdenListDTO>> ObtenerOrdenesAsync();
        Task<bool> CambiarEstadoAsync(int id, EstadoOrden nuevoEstado);
    }
}