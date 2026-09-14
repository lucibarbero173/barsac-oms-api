using BarsacOMS.Api.DTOs;

namespace BarsacOMS.Api.Services
{
    public interface IDisenoService
    {
        Task<List<FichaResumenEtapaDto>> ObtenerFichasPendientesAsync();
        Task<FichaDetalleEtapaDto?> ObtenerFichaAsync(int fichaId);
        Task<bool> GuardarImagenAsync(int fichaId, string? imagenBase64);
        Task<ResultadoEtapaDto?> ToggleUnidadAsync(int unidadId, int? usuarioId);
        Task<List<AlertaFaltanteDto>> ObtenerAlertasFaltantesAsync();
    }
}
