using BarsacOMS.Api.DTOs;

namespace BarsacOMS.Api.Services
{
    public interface IChatService
    {
        Task<List<ConversacionChatDto>> ObtenerConversacionesAsync(UsuarioChat usuario);
        Task<(bool Ok, List<MensajeChatDto> Mensajes)> ObtenerMensajesAsync(UsuarioChat usuario, string canal, int? despuesDe);
        Task<(MensajeChatDto? Mensaje, string? Error)> EnviarAsync(UsuarioChat usuario, EnviarMensajeChatDto dto);
        Task<bool> MarcarLeidoAsync(UsuarioChat usuario, string canal, int hastaId);
    }
}
