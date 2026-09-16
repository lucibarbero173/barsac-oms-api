using BarsacOMS.Api.DTOs;

namespace BarsacOMS.Api.Services
{
    public interface ICorteService
    {
        Task<List<FichaResumenEtapaDto>> ObtenerFichasPendientesAsync();
        Task<FichaDetalleEtapaDto?> ObtenerFichaAsync(int fichaId);
        Task<ResultadoEtapaDto?> CompletarUnidadAsync(int unidadId, int? usuarioId);
        Task<ResultadoEtapaDto?> RegistrarFaltanteAsync(int unidadId, string detalle, int? usuarioId);
        Task<ResultadoEtapaDto?> DeshacerUnidadAsync(int unidadId);
    }
}
