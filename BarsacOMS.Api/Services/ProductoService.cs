using BarsacOMS.Api.Data;
using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BarsacOMS.Api.Services
{
    public class ProductoService : IProductoService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<ProductoService> _logger;

        public ProductoService(AppDbContext context, ILogger<ProductoService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<IEnumerable<ProductoListDTO>> ObtenerProductosAsync()
        {
            var productos = await _context.Productos
                .Include(p => p.Precios)
                .ToListAsync();

            return productos.Select(MapearAProductoListDTO);
        }

        public async Task<ProductoListDTO?> ObtenerProductoPorIdAsync(int id)
        {
            var producto = await _context.Productos
                .Include(p => p.Precios)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (producto == null) return null;

            return MapearAProductoListDTO(producto);
        }

        public async Task<decimal> ObtenerPrecioAsync(int productoId, string talle, string tipoPago)
        {
            var producto = await _context.Productos
                .Include(p => p.Precios)
                .FirstOrDefaultAsync(p => p.Id == productoId);

            if (producto == null) return 0;

            var precios = producto.Precios ?? new List<PrecioProducto>();

            var precioObj = precios.FirstOrDefault(pr =>
                pr.Talle != null && pr.Talle.Equals(talle, StringComparison.OrdinalIgnoreCase) &&
                pr.TipoPago != null && pr.TipoPago.Equals(tipoPago, StringComparison.OrdinalIgnoreCase));

            return precioObj?.Precio ?? 0;
        }

        public async Task<ProductoListDTO> CrearProductoAsync(GuardarProductoDTO dto)
        {
            try
            {
                _logger.LogInformation("Iniciando creación de producto: {Nombre}", dto.Nombre);

                var nuevoProducto = new Producto { Nombre = dto.Nombre };

                MapearOActualizarPrecios(nuevoProducto, dto);

                _logger.LogInformation("Producto mapeado, añadiendo a contexto");
                _context.Productos.Add(nuevoProducto);

                _logger.LogInformation("Guardando cambios en base de datos");
                await _context.SaveChangesAsync();

                _logger.LogInformation("Producto creado exitosamente con ID: {ProductoId}", nuevoProducto.Id);
                return MapearAProductoListDTO(nuevoProducto);
            }
            catch (DbUpdateException dbEx)
            {
                _logger.LogError(dbEx, "Error de base de datos al crear producto");
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error general al crear producto");
                throw;
            }
        }

        public async Task<bool> ActualizarProductoAsync(int id, GuardarProductoDTO dto)
        {
            var producto = await _context.Productos
                .Include(p => p.Precios)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (producto == null) return false;

            producto.Nombre = dto.Nombre;
            MapearOActualizarPrecios(producto, dto);

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> EliminarProductoAsync(int id)
        {
            var producto = await _context.Productos.FindAsync(id);
            if (producto == null) return false;

            _context.Productos.Remove(producto);
            await _context.SaveChangesAsync();
            return true;
        }

        // --- MÉTODOS PRIVADOS AUXILIARES SEGUROS ---
        private static ProductoListDTO MapearAProductoListDTO(Producto p)
        {
            // Evitamos NullReferenceException si p.Precios es null
            var precios = p.Precios ?? new List<PrecioProducto>();

            return new ProductoListDTO
            {
                Id = p.Id,
                Nombre = p.Nombre ?? "",
                PrecioAdultoEfectivo = precios.FirstOrDefault(pr => pr.Talle == "ADULTO" && pr.TipoPago == "EFECTIVO")?.Precio ?? 0,
                PrecioAdultoTransf = precios.FirstOrDefault(pr => pr.Talle == "ADULTO" && pr.TipoPago == "TRANSFERENCIA")?.Precio ?? 0,
                PrecioNinoEfectivo = precios.FirstOrDefault(pr => pr.Talle == "NIÑO" && pr.TipoPago == "EFECTIVO")?.Precio ?? 0,
                PrecioNinoTransf = precios.FirstOrDefault(pr => pr.Talle == "NIÑO" && pr.TipoPago == "TRANSFERENCIA")?.Precio ?? 0
            };
        }

        private static void MapearOActualizarPrecios(Producto producto, GuardarProductoDTO dto)
        {
            SetearPrecio(producto, "ADULTO", "EFECTIVO", dto.PrecioAdultoEfectivo);
            SetearPrecio(producto, "ADULTO", "TRANSFERENCIA", dto.PrecioAdultoTransf);
            SetearPrecio(producto, "NIÑO", "EFECTIVO", dto.PrecioNinoEfectivo);
            SetearPrecio(producto, "NIÑO", "TRANSFERENCIA", dto.PrecioNinoTransf);
        }

        private static void SetearPrecio(Producto producto, string talle, string tipoPago, decimal precio)
        {
            producto.Precios ??= new List<PrecioProducto>();

            var precioExistente = producto.Precios.FirstOrDefault(x => x.Talle == talle && x.TipoPago == tipoPago);
            if (precioExistente != null)
            {
                precioExistente.Precio = precio;
            }
            else
            {
                producto.Precios.Add(new PrecioProducto { Talle = talle, TipoPago = tipoPago, Precio = precio });
            }
        }
    }
}