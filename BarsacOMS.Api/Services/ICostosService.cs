using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Models;

namespace BarsacOMS.Api.Services
{
    public interface ICostosService
    {
        Task<List<CostoProductoDto>> ObtenerTodosLosCostosAsync();
        Task<CostoProductoDto?> ObtenerCostoPorProductoAsync(int productoId);
        Task<CostoProductoDto?> GuardarCostoProductoAsync(int productoId, GuardarCostoProductoDto dto);

        Task<ConfiguracionCostos> ObtenerConfiguracionAsync();
        Task<ConfiguracionCostos> ActualizarConfiguracionAsync(int produccionMensualEstimada);

        Task<List<GastoGeneral>> ObtenerGastosGeneralesAsync();
        Task<GastoGeneral> CrearGastoGeneralAsync(GastoGeneral gasto);
        Task<bool> ActualizarGastoGeneralAsync(int id, GastoGeneral gasto);
        Task<bool> EliminarGastoGeneralAsync(int id);
    }
}
