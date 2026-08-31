using BarsacOMS.Api.DTOs;

namespace BarsacOMS.Api.Services
{
    public interface IUsuarioService
    {
        Task<IEnumerable<UsuarioDto>> ObtenerUsuariosAsync();
        Task<UsuarioDto?> ObtenerUsuarioPorIdAsync(int id);
        Task<(bool Exito, string Mensaje, UsuarioDto? Usuario)> CrearUsuarioAsync(CrearUsuarioDto dto);
        Task<(bool Exito, string Mensaje)> ActualizarUsuarioAsync(int id, ActualizarUsuarioDto dto);
    }
}
