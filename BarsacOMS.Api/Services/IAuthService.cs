using BarsacOMS.Api.DTOs;

namespace BarsacOMS.Api.Services
{
    public interface IAuthService
    {
        Task<(bool Exito, string Mensaje)> RegistrarUsuarioAsync(RegisterDto dto);
        Task<ResultadoLoginDto> LoginAsync(LoginDto dto);
    }
}
