using BarsacOMS.Api.Models;

namespace BarsacOMS.Api.Services
{
    public interface IProveedorService
    {
        Task<IEnumerable<Proveedor>> ObtenerProveedoresAsync();
        Task<Proveedor?> ObtenerProveedorPorIdAsync(int id);
        Task<Proveedor> CrearProveedorAsync(Proveedor proveedor);
        Task<bool> ActualizarProveedorAsync(int id, Proveedor proveedor);
        Task<bool> EliminarProveedorAsync(int id);
    }
}