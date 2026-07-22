using BarsacOMS.Api.Models;

namespace BarsacOMS.Api.Services
{
    public interface ICobroService
    {
        Task<List<Cobro>> ObtenerTodosAsync();
        Task<Cobro?> ObtenerPorIdAsync(int id);
        Task<Cobro> CrearCobroAsync(Cobro cobro);

        Task<bool> ActualizarCobroAsync(int id, Cobro cobro);
        Task<bool> EliminarCobroAsync(int id);
    }
}
