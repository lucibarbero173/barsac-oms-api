using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Models;

namespace BarsacOMS.Api.Services
{
    public interface ICorteService
    {
        Task<List<FichaResumenEtapaDto>> ObtenerFichasPendientesAsync();
        Task<FichaDetalleEtapaDto?> ObtenerFichaAsync(int fichaId);
        Task<ResultadoEtapaDto?> CompletarUnidadAsync(int unidadId, int? usuarioId);
        Task<ResultadoEtapaDto?> RegistrarFaltanteAsync(int unidadId, ParteFaltante parte, string? detalle, int? usuarioId);
        Task<ResultadoEtapaDto?> DeshacerUnidadAsync(int unidadId);
    }
}
