using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Models;

namespace BarsacOMS.Api.Services
{
    public interface IConciliacionService
    {
        IReadOnlyList<string> ObtenerCuentas();

        Task<List<ResumenCuentaDto>> ObtenerResumenCuentasAsync();
        Task<List<MovimientoCuentaDto>> ObtenerLibroAsync(string cuenta);

        Task<SaldoInicialCuenta> ObtenerSaldoInicialAsync(string cuenta);
        Task<SaldoInicialCuenta> GuardarSaldoInicialAsync(string cuenta, GuardarSaldoInicialDto dto);

        Task<MovimientoManualCuenta> CrearMovimientoManualAsync(GuardarMovimientoManualDto dto);
        Task<bool> ActualizarMovimientoManualAsync(int id, GuardarMovimientoManualDto dto);
        Task<bool> EliminarMovimientoManualAsync(int id);
    }
}
