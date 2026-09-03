using BarsacOMS.Api.DTOs;

namespace BarsacOMS.Api.Services
{
    public interface IPerfilService
    {
        Task<PerfilUsuarioDto?> ObtenerPerfilAsync(int usuarioId);
        Task<(bool Exito, string? Error, PerfilUsuarioDto? Perfil)> ActualizarPerfilAsync(int usuarioId, ActualizarPerfilDto dto);
    }
}
