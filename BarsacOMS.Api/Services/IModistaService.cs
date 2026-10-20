using BarsacOMS.Api.DTOs;

namespace BarsacOMS.Api.Services
{
    public interface IModistaService
    {
        Task<List<ModistaDTO>> ObtenerModistasAsync();
        Task<ModistaDTO> CrearModistaAsync(GuardarModistaDTO dto);
        Task<bool> ActualizarModistaAsync(int id, GuardarModistaDTO dto);
        Task<List<TarifaModistaDTO>?> ObtenerTarifasAsync(int modistaId);
        Task<bool> GuardarTarifasAsync(int modistaId, List<GuardarTarifaDTO> tarifas);
    }
}
