using BarsacOMS.Api.DTOs;

namespace BarsacOMS.Api.Services
{
    public interface IDisenoService
    {
        Task<List<FichaResumenEtapaDto>> ObtenerFichasPendientesAsync();
        Task<List<FichaResumenEtapaDto>> ObtenerFichasRecienTerminadasAsync();
        Task<FichaDetalleEtapaDto?> ObtenerFichaAsync(int fichaId);
        Task<ResultadoEtapaDto?> ToggleUnidadAsync(int unidadId, int? usuarioId);
        Task<List<AlertaFaltanteDto>> ObtenerAlertasFaltantesAsync();
    }
}
