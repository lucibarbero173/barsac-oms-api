using BarsacOMS.Api.DTOs;

namespace BarsacOMS.Api.Services
{
    public interface IEstadisticasService
    {
        Task<DashboardEstadisticasDto> ObtenerDashboardEstadisticasAsync();
        Task<EstadisticasFaltantesDto> ObtenerEstadisticasFaltantesAsync();
    }
}