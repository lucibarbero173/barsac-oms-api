using System.Security.Claims;
using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarsacOMS.Api.Controllers
{
    // Cualquier usuario logueado usa el chat; qué conversaciones ve lo decide ChatService según su rol.
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class ChatController : ControllerBase
    {
        private readonly IChatService _chatService;

        public ChatController(IChatService chatService)
        {
            _chatService = chatService;
        }

        private UsuarioChat ObtenerUsuarioActual() => new(
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!),
            User.FindFirstValue(ClaimTypes.Name) ?? "",
            User.FindFirstValue(ClaimTypes.Role) ?? "");

        // GET: api/Chat/conversaciones
        [HttpGet("conversaciones")]
        public async Task<IActionResult> GetConversaciones()
        {
            return Ok(await _chatService.ObtenerConversacionesAsync(ObtenerUsuarioActual()));
        }

        // GET: api/Chat/mensajes?canal=general&despuesDe=120
        [HttpGet("mensajes")]
        public async Task<IActionResult> GetMensajes([FromQuery] string canal, [FromQuery] int? despuesDe)
        {
            var (ok, mensajes) = await _chatService.ObtenerMensajesAsync(ObtenerUsuarioActual(), canal ?? "", despuesDe);
            if (!ok) return Forbid();
            return Ok(mensajes);
        }

        // POST: api/Chat/mensajes
        [HttpPost("mensajes")]
        public async Task<IActionResult> Enviar([FromBody] EnviarMensajeChatDto dto)
        {
            var (mensaje, error) = await _chatService.EnviarAsync(ObtenerUsuarioActual(), dto);
            if (error != null) return BadRequest(error);
            return Ok(mensaje);
        }

        // POST: api/Chat/leido
        [HttpPost("leido")]
        public async Task<IActionResult> MarcarLeido([FromBody] MarcarLeidoChatDto dto)
        {
            var ok = await _chatService.MarcarLeidoAsync(ObtenerUsuarioActual(), dto.Canal ?? "", dto.HastaId);
            if (!ok) return Forbid();
            return NoContent();
        }
    }
}
