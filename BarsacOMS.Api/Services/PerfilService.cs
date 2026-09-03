using BarsacOMS.Api.Data;
using BarsacOMS.Api.DTOs;
using Microsoft.EntityFrameworkCore;

namespace BarsacOMS.Api.Services
{
    public class PerfilService : IPerfilService
    {
        private readonly AppDbContext _context;

        public PerfilService(AppDbContext context)
        {
            _context = context;
        }

        private static PerfilUsuarioDto AUsuarioDto(Models.Usuario u) => new PerfilUsuarioDto
        {
            Id = u.Id,
            Nombre = u.Nombre,
            Email = u.Email,
            Rol = u.Rol,
            FotoBase64 = u.FotoBase64
        };

        public async Task<PerfilUsuarioDto?> ObtenerPerfilAsync(int usuarioId)
        {
            var usuario = await _context.Usuarios.FindAsync(usuarioId);
            return usuario == null ? null : AUsuarioDto(usuario);
        }

        public async Task<(bool Exito, string? Error, PerfilUsuarioDto? Perfil)> ActualizarPerfilAsync(int usuarioId, ActualizarPerfilDto dto)
        {
            var usuario = await _context.Usuarios.FindAsync(usuarioId);
            if (usuario == null) return (false, "Usuario no encontrado.", null);

            if (string.IsNullOrWhiteSpace(dto.Nombre) || string.IsNullOrWhiteSpace(dto.Email))
            {
                return (false, "Nombre y email son obligatorios.", null);
            }

            var emailEnUso = await _context.Usuarios.AnyAsync(u => u.Id != usuarioId && u.Email == dto.Email);
            if (emailEnUso) return (false, "Ese email ya lo usa otro usuario.", null);

            if (!string.IsNullOrEmpty(dto.PasswordNueva))
            {
                if (string.IsNullOrEmpty(dto.PasswordActual) || !BCrypt.Net.BCrypt.Verify(dto.PasswordActual, usuario.PasswordHash))
                {
                    return (false, "La contraseña actual no es correcta.", null);
                }
                usuario.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.PasswordNueva);
            }

            usuario.Nombre = dto.Nombre;
            usuario.Email = dto.Email;
            usuario.FotoBase64 = dto.FotoBase64;

            await _context.SaveChangesAsync();
            return (true, null, AUsuarioDto(usuario));
        }
    }
}
