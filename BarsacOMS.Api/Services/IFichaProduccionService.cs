using BarsacOMS.Api.Models;

namespace BarsacOMS.Api.Services
{
    public interface IFichaProduccionService
    {
        Task<List<FichaProduccion>> GetAllAsync();
        Task<FichaProduccion?> GetByIdAsync(int id);
        Task<FichaProduccion?> ObtenerFichaPorOrdenAsync(int ordenId); // <--- Agrega esta línea
        Task<FichaProduccion> CreateAsync(FichaProduccion ficha);
        Task<bool> UpdateAsync(FichaProduccion ficha);
        Task<bool> DeleteAsync(int id);
        Task<List<OrdenTrabajo>> GetOrdenesSinFichaAsync();
    }
}