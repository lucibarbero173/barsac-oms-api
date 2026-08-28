using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BarsacOMS.Api.Services;

namespace BarsacOMS.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class EstadisticasController : ControllerBase
    {
        private readonly IEstadisticasService _estadisticasService;

        public EstadisticasController(IEstadisticasService estadisticasService)
        {
            _estadisticasService = estadisticasService;
        }

        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard()
        {
            try
            {
                var data = await _estadisticasService.ObtenerDashboardEstadisticasAsync();
                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { mensaje = "Error al obtener las estadísticas", error = ex.Message });
            }
        }
    }
}