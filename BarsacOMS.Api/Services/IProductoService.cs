using BarsacOMS.Api.DTOs;

namespace BarsacOMS.Api.Services
{
    public interface IProductoService
    {
        Task<IEnumerable<ProductoListDTO>> ObtenerProductosAsync();
        Task<ProductoListDTO?> ObtenerProductoPorIdAsync(int id);
        Task<decimal> ObtenerPrecioAsync(int productoId, string talle, string tipoPago);
        Task<ProductoListDTO> CrearProductoAsync(GuardarProductoDTO dto);
        Task<bool> ActualizarProductoAsync(int id, GuardarProductoDTO dto);
        Task<bool> EliminarProductoAsync(int id);
    }
}