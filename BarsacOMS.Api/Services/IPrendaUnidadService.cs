using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Models;

namespace BarsacOMS.Api.Services
{
    public interface IPrendaUnidadService
    {
        // Crea las PrendaUnidad de una línea recién guardada (Cantidades filas). Usado por FichaProduccionService.
        Task GenerarUnidadesAsync(DetalleFichaProduccion item);

        Task<List<PrendaUnidadDto>> ObtenerPorFichaAsync(int fichaId);

        Task<EscanearResultadoDto?> EscanearAsync(int prendaUnidadId, int? usuarioId);

        Task<ResumenControlOrdenDto?> ObtenerResumenPorOrdenAsync(int ordenId);
    }
}
