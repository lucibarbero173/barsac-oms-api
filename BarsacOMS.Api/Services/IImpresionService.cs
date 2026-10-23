using BarsacOMS.Api.DTOs;

namespace BarsacOMS.Api.Services
{
    public interface IImpresionService
    {
        Task<List<FichaImpresionDto>> ObtenerFichasPendientesAsync();
        Task<List<FichaImpresionDto>> ObtenerFichasRecienImpresasAsync();
        Task<FichaImpresionDto?> ObtenerFichaAsync(int fichaId);
        Task<(bool Exito, string? Error)> MarcarImpresaAsync(int fichaId, int? usuarioId);
        Task<(bool Exito, string? Error)> DeshacerImpresionAsync(int fichaId);
    }
}
