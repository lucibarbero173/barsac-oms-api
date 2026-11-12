using BarsacOMS.Api.DTOs;

namespace BarsacOMS.Api.Services
{
    public interface ITesoreriaService
    {
        bool CuentaValida(string cuenta);
        Task<List<ResumenTesoreriaDto>> ObtenerResumenAsync();
        Task<List<MovimientoTesoreriaDto>> ObtenerMovimientosAsync(string cuenta, DateTime? desde, DateTime? hasta);
        Task<GraficoTesoreriaDto> ObtenerGraficoAsync(string cuenta);
        Task<PantallaConciliarDto> ObtenerPantallaConciliarAsync(string cuenta, DateTime? desde, DateTime? hasta);
        Task<(ResultadoCargaExtractoDto? Resultado, string? Error)> CargarExtractoAsync(string cuenta, CargarExtractoDto dto);
        Task<(int Eliminados, string? Error)> EliminarExtractoAsync(string cuenta, List<int> ids);
        Task<(int? ConciliacionId, string? Error)> ConciliarAsync(string cuenta, ConciliarDto dto, int? usuarioId);
        Task<int> ConciliarAutomaticoAsync(string cuenta, int? usuarioId);
        Task<bool> DeshacerConciliacionAsync(int conciliacionId);
        Task<string?> CrearMovimientoDesdeExtractoAsync(string cuenta, int extractoId, string? concepto, int? usuarioId);
    }
}
