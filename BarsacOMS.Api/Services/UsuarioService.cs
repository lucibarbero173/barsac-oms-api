using BarsacOMS.Api.Data;
using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BarsacOMS.Api.Services
{
    public class UsuarioService : IUsuarioService
    {
        // Roles válidos hoy. Se amplía cuando se sumen los roles de las próximas fases (corte, preparacion).
        private static readonly string[] RolesValidos = { "admin", "control" };

        private readonly AppDbContext _context;

        public UsuarioService(AppDbContext context)
        {
            _context = context;
        }

        private static UsuarioDto AUsuarioDto(Usuario u) => new UsuarioDto
        {
            Id = u.Id,
            Nombre = u.Nombre,
            Email = u.Email,
            Rol = u.Rol,
            Activo = u.Activo,
            CreatedAt = u.CreatedAt
        };

        public async Task<IEnumerable<UsuarioDto>> ObtenerUsuariosAsync()
        {
            return await _context.Usuarios
                .OrderBy(u => u.Nombre)
                .Select(u => AUsuarioDto(u))
                .ToListAsync();
        }

        public async Task<UsuarioDto?> ObtenerUsuarioPorIdAsync(int id)
        {
            var usuario = await _context.Usuarios.FindAsync(id);
            return usuario == null ? null : AUsuarioDto(usuario);
        }

        public async Task<(bool Exito, string Mensaje, UsuarioDto? Usuario)> CrearUsuarioAsync(CrearUsuarioDto dto)
        {
            if (!RolesValidos.Contains(dto.Rol))
            {
                return (false, $"Rol inválido. Roles permitidos: {string.Join(", ", RolesValidos)}", null);
            }

            var existeEmail = await _context.Usuarios
                .AnyAsync(u => u.Email.ToLower() == dto.Email.ToLower().Trim());

            if (existeEmail)
            {
                return (false, "El correo electrónico ya se encuentra registrado.", null);
            }

            var usuario = new Usuario
            {
                Nombre = dto.Nombre.Trim(),
                Email = dto.Email.ToLower().Trim(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Rol = dto.Rol,
                Activo = true
            };

            try
            {
                _context.Usuarios.Add(usuario);
                await _context.SaveChangesAsync();
                return (true, "Usuario creado correctamente.", AUsuarioDto(usuario));
            }
            catch (DbUpdateException ex)
            {
                var innerMessage = ex.InnerException?.Message ?? ex.Message;
                throw new Exception($"Error de BD: {innerMessage}");
            }
        }

        public async Task<(bool Exito, string Mensaje)> ActualizarUsuarioAsync(int id, ActualizarUsuarioDto dto)
        {
            if (!RolesValidos.Contains(dto.Rol))
            {
                return (false, $"Rol inválido. Roles permitidos: {string.Join(", ", RolesValidos)}");
            }

            var usuario = await _context.Usuarios.FindAsync(id);
            if (usuario == null)
            {
                return (false, "Usuario no encontrado.");
            }

            usuario.Nombre = dto.Nombre.Trim();
            usuario.Rol = dto.Rol;
            usuario.Activo = dto.Activo;

            if (!string.IsNullOrWhiteSpace(dto.Password))
            {
                usuario.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
            }

            await _context.SaveChangesAsync();
            return (true, "Usuario actualizado correctamente.");
        }
    }
}
