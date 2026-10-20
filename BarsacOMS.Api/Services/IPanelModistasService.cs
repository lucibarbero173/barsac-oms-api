using BarsacOMS.Api.DTOs;

namespace BarsacOMS.Api.Services
{
    public interface IPanelModistasService
    {
        Task<PanelModistasDto> ObtenerPanelAsync(DateTime? desde, DateTime? hasta);
        Task<DetalleModistaPanelDto?> ObtenerDetalleAsync(int modistaId);
        Task<(ResultadoPagoModistaDto? Resultado, string? Error)> RegistrarPagoAsync(int modistaId, string? nota);
        Task<bool> AnularPagoAsync(int pagoId);
    }
}
