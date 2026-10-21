using BarsacOMS.Api.DTOs;

namespace BarsacOMS.Api.Services
{
    public interface IMisPrendasService
    {
        Task<int?> ObtenerModistaIdAsync(int usuarioId);
        Task<List<FichaModistaDto>> ObtenerFichasAsync(int modistaId, bool terminadas);
        Task<string?> ObtenerImagenAsync(int modistaId, int fichaId);
        Task<(bool Exito, string? Error)> MarcarCosidasAsync(int modistaId, int detalleId, int cosidas);
        Task<(bool Exito, string? Error)> CargarExtraAsync(int modistaId, int fichaId, CargarPrendaExtraDto dto);
        Task<(bool Exito, string? Error)> BorrarExtraAsync(int modistaId, int extraId);
    }
}
