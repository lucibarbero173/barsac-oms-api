using BarsacOMS.Api.DTOs;

namespace BarsacOMS.Api.Services
{
    public interface IPanelModistasService
    {
        Task<PanelModistasDto> ObtenerPanelAsync(DateTime? desde, DateTime? hasta);
        Task<DetalleModistaPanelDto?> ObtenerDetalleAsync(int modistaId);
        Task<(ResultadoPagoModistaDto? Resultado, string? Error)> RegistrarPagoAsync(int modistaId, string? nota, string? medioPago);
        Task<bool> AnularPagoAsync(int pagoId);
        Task<(bool Exito, string? Error)> CambiarPrecioAsync(int modistaId, CambiarPrecioModistaDto dto);
        Task<(bool Exito, string? Error)> RevisarExtraAsync(int extraId, bool aprobar);
    }
}
