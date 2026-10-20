using BarsacOMS.Api.DTOs;

namespace BarsacOMS.Api.Services
{
    public interface IConfeccionService
    {
        Task<List<FichaConfeccionResumenDto>> ObtenerFichasPorAsignarAsync();
        Task<List<FichaConfeccionResumenDto>> ObtenerFichasRecienAsignadasAsync();
        Task<FichaConfeccionDetalleDto?> ObtenerFichaAsync(int fichaId);
        Task<(bool Exito, string? Error)> GuardarAsignacionesAsync(int fichaId, List<GuardarAsignacionRenglonDto> renglones);
    }
}
