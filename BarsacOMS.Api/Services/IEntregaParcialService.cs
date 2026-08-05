using BarsacOMS.Api.Models;

namespace BarsacOMS.Api.Services
{
    public interface IEntregaParcialService
    {
        Task<IEnumerable<EntregaParcial>> ObtenerPorFichaAsync(int fichaId);
        Task<bool> RegistrarEntregaParcialAsync(int fichaId, List<EntregaParcial> entregas);
    }
}