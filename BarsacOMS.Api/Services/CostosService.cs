using BarsacOMS.Api.Data;
using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BarsacOMS.Api.Services
{
    public class CostosService : ICostosService
    {
        private readonly AppDbContext _context;

        public CostosService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<CostoProductoDto>> ObtenerTodosLosCostosAsync()
        {
            var productos = await _context.Productos.OrderBy(p => p.Nombre).ToListAsync();
            var costos = await _context.CostosProducto
                .Include(c => c.MateriaPrimaTela)
                .ToDictionaryAsync(c => c.ProductoId);

            var otrosCostosUnitario = await CalcularOtrosCostosUnitarioAsync();

            return productos
                .Select(p => Calcular(p, costos.GetValueOrDefault(p.Id), otrosCostosUnitario))
                .ToList();
        }

        public async Task<CostoProductoDto?> ObtenerCostoPorProductoAsync(int productoId)
        {
            var producto = await _context.Productos.FindAsync(productoId);
            if (producto == null) return null;

            var costo = await _context.CostosProducto
                .Include(c => c.MateriaPrimaTela)
                .FirstOrDefaultAsync(c => c.ProductoId == productoId);

            var otrosCostosUnitario = await CalcularOtrosCostosUnitarioAsync();
            return Calcular(producto, costo, otrosCostosUnitario);
        }

        public async Task<CostoProductoDto?> GuardarCostoProductoAsync(int productoId, GuardarCostoProductoDto dto)
        {
            var producto = await _context.Productos.FindAsync(productoId);
            if (producto == null) return null;

            var costo = await _context.CostosProducto.FirstOrDefaultAsync(c => c.ProductoId == productoId);
            if (costo == null)
            {
                costo = new CostoProducto { ProductoId = productoId };
                _context.CostosProducto.Add(costo);
            }

            costo.MateriaPrimaTelaId = dto.MateriaPrimaTelaId;
            costo.PrendasPorKg = dto.PrendasPorKg;
            costo.Scrap = dto.Scrap;
            costo.Flete = dto.Flete;
            costo.Cierre = dto.Cierre;
            costo.ElasticoCapucha = dto.ElasticoCapucha;
            costo.Impresion = dto.Impresion;
            costo.Confeccion = dto.Confeccion;
            costo.RemarquePorcentaje = dto.RemarquePorcentaje;

            await _context.SaveChangesAsync();

            var telaGuardada = costo.MateriaPrimaTelaId.HasValue
                ? await _context.MateriasPrimas.FindAsync(costo.MateriaPrimaTelaId.Value)
                : null;
            costo.MateriaPrimaTela = telaGuardada;

            var otrosCostosUnitario = await CalcularOtrosCostosUnitarioAsync();
            return Calcular(producto, costo, otrosCostosUnitario);
        }

        public async Task<ConfiguracionCostos> ObtenerConfiguracionAsync()
        {
            var config = await _context.ConfiguracionCostos.FirstOrDefaultAsync();
            if (config == null)
            {
                config = new ConfiguracionCostos { ProduccionMensualEstimada = 0 };
                _context.ConfiguracionCostos.Add(config);
                await _context.SaveChangesAsync();
            }
            return config;
        }

        public async Task<ConfiguracionCostos> ActualizarConfiguracionAsync(int produccionMensualEstimada)
        {
            var config = await ObtenerConfiguracionAsync();
            config.ProduccionMensualEstimada = produccionMensualEstimada;
            await _context.SaveChangesAsync();
            return config;
        }

        public async Task<List<GastoGeneral>> ObtenerGastosGeneralesAsync()
        {
            return await _context.GastosGenerales.OrderBy(g => g.Tipo).ThenBy(g => g.Nombre).ToListAsync();
        }

        public async Task<GastoGeneral> CrearGastoGeneralAsync(GastoGeneral gasto)
        {
            _context.GastosGenerales.Add(gasto);
            await _context.SaveChangesAsync();
            return gasto;
        }

        public async Task<bool> ActualizarGastoGeneralAsync(int id, GastoGeneral gasto)
        {
            var existente = await _context.GastosGenerales.FindAsync(id);
            if (existente == null) return false;

            existente.Nombre = gasto.Nombre;
            existente.MontoMensual = gasto.MontoMensual;
            existente.Tipo = gasto.Tipo;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> EliminarGastoGeneralAsync(int id)
        {
            var existente = await _context.GastosGenerales.FindAsync(id);
            if (existente == null) return false;

            _context.GastosGenerales.Remove(existente);
            await _context.SaveChangesAsync();
            return true;
        }

        private async Task<decimal> CalcularOtrosCostosUnitarioAsync()
        {
            var config = await ObtenerConfiguracionAsync();
            if (config.ProduccionMensualEstimada <= 0) return 0;

            var totalGastos = await _context.GastosGenerales.SumAsync(g => (decimal?)g.MontoMensual) ?? 0;
            return totalGastos / config.ProduccionMensualEstimada;
        }

        private static CostoProductoDto Calcular(Producto producto, CostoProducto? costo, decimal otrosCostosUnitario)
        {
            var prendasPorKg = costo?.PrendasPorKg ?? 0;
            var scrap = costo?.Scrap ?? 1;
            var precioPorKilo = costo?.MateriaPrimaTela?.PrecioPorKilo ?? 0;

            var costoTelaUnitario = prendasPorKg > 0
                ? (precioPorKilo / prendasPorKg) * scrap
                : 0;

            var flete = costo?.Flete ?? 0;
            var cierre = costo?.Cierre ?? 0;
            var elasticoCapucha = costo?.ElasticoCapucha ?? 0;
            var impresion = costo?.Impresion ?? 0;
            var confeccion = costo?.Confeccion ?? 0;
            var remarquePorcentaje = costo?.RemarquePorcentaje ?? 0;

            var costoTotal = costoTelaUnitario + flete + cierre + elasticoCapucha + impresion + confeccion + otrosCostosUnitario;
            var precioVentaEstimado = costoTotal * (1 + remarquePorcentaje / 100);

            return new CostoProductoDto
            {
                ProductoId = producto.Id,
                ProductoNombre = producto.Nombre,

                MateriaPrimaTelaId = costo?.MateriaPrimaTelaId,
                TelaNombre = costo?.MateriaPrimaTela?.Nombre,
                TelaPrecioPorKilo = costo?.MateriaPrimaTela?.PrecioPorKilo,

                PrendasPorKg = prendasPorKg,
                Scrap = scrap,
                Flete = flete,
                Cierre = cierre,
                ElasticoCapucha = elasticoCapucha,
                Impresion = impresion,
                Confeccion = confeccion,
                RemarquePorcentaje = remarquePorcentaje,

                CostoTelaUnitario = costoTelaUnitario,
                OtrosCostosUnitario = otrosCostosUnitario,
                CostoTotal = costoTotal,
                PrecioVentaEstimado = precioVentaEstimado
            };
        }
    }
}
