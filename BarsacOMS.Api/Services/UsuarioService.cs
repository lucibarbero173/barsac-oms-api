using BarsacOMS.Api.Data;
using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BarsacOMS.Api.Services
{
    public class UsuarioService : IUsuarioService
    {
        // Roles válidos hoy. Se amplía cuando se sumen los roles de las próximas fases (corte, preparacion).
        private static readonly string[] RolesValidos = { "admin", "control", "diseno", "corte", "modista" };

        private readonly AppDbContext _context;

        public UsuarioService(AppDbContext context)
        {
            _context = context;
        }

        private static UsuarioDto AUsuarioDto(Usuario u, Modista? modista) => new UsuarioDto
        {
            Id = u.Id,
            Nombre = u.Nombre,
            Email = u.Email,
            Rol = u.Rol,
            Activo = u.Activo,
            CreatedAt = u.CreatedAt,
            ModistaId = modista?.Id,
            ModistaNombre = modista?.Nombre
        };

        public async Task<IEnumerable<UsuarioDto>> ObtenerUsuariosAsync()
        {
            var usuarios = await _context.Usuarios
                .AsNoTracking()
                .OrderBy(u => u.Nombre)
                .ToListAsync();

            var modistasPorUsuario = await _context.Modistas
                .AsNoTracking()
                .Where(m => m.UsuarioId != null)
                .ToDictionaryAsync(m => m.UsuarioId!.Value);

            return usuarios
                .Select(u => AUsuarioDto(u, modistasPorUsuario.GetValueOrDefault(u.Id)))
                .ToList();
        }

        public async Task<UsuarioDto?> ObtenerUsuarioPorIdAsync(int id)
        {
            var usuario = await _context.Usuarios.FindAsync(id);
            if (usuario == null) return null;

            var modista = await _context.Modistas.AsNoTracking().FirstOrDefaultAsync(m => m.UsuarioId == id);
            return AUsuarioDto(usuario, modista);
        }

        // Para rol "modista" el usuario tiene que quedar vinculado a una modista que no tenga ya otro usuario.
        // Devuelve null si está todo bien, o el mensaje de error.
        private async Task<string?> ValidarModistaAsync(string rol, int? modistaId, int? usuarioId)
        {
            if (rol != "modista") return null;
            if (!modistaId.HasValue) return "Elegí a qué modista corresponde este usuario.";

            var modista = await _context.Modistas.AsNoTracking().FirstOrDefaultAsync(m => m.Id == modistaId.Value);
            if (modista == null) return "La modista elegida no existe.";
            if (modista.UsuarioId.HasValue && modista.UsuarioId != usuarioId)
                return $"{modista.Nombre} ya tiene otro usuario vinculado.";

            return null;
        }

        // Deja al usuario vinculado solo a la modista elegida (o a ninguna si ya no es rol "modista").
        private async Task VincularModistaAsync(int usuarioId, string rol, int? modistaId)
        {
            var nuevaId = rol == "modista" ? modistaId : null;

            var anteriores = await _context.Modistas
                .Where(m => m.UsuarioId == usuarioId && m.Id != nuevaId)
                .ToListAsync();
            anteriores.ForEach(m => m.UsuarioId = null);

            if (nuevaId.HasValue)
            {
                var modista = await _context.Modistas.FindAsync(nuevaId.Value);
                modista!.UsuarioId = usuarioId;
            }
        }

        public async Task<(bool Exito, string Mensaje, UsuarioDto? Usuario)> CrearUsuarioAsync(CrearUsuarioDto dto)
        {
            if (!RolesValidos.Contains(dto.Rol))
            {
                return (false, $"Rol inválido. Roles permitidos: {string.Join(", ", RolesValidos)}", null);
            }

            var errorModista = await ValidarModistaAsync(dto.Rol, dto.ModistaId, null);
            if (errorModista != null) return (false, errorModista, null);

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
                // Transacción: si falla el vínculo con la modista no queda el usuario creado a medias
                await using var transaccion = await _context.Database.BeginTransactionAsync();

                _context.Usuarios.Add(usuario);
                await _context.SaveChangesAsync();

                // El vínculo necesita el Id del usuario recién creado
                await VincularModistaAsync(usuario.Id, dto.Rol, dto.ModistaId);
                await _context.SaveChangesAsync();

                await transaccion.CommitAsync();

                return (true, "Usuario creado correctamente.", await ObtenerUsuarioPorIdAsync(usuario.Id));
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

            var errorModista = await ValidarModistaAsync(dto.Rol, dto.ModistaId, id);
            if (errorModista != null) return (false, errorModista);

            usuario.Nombre = dto.Nombre.Trim();
            usuario.Rol = dto.Rol;
            usuario.Activo = dto.Activo;

            if (!string.IsNullOrWhiteSpace(dto.Password))
            {
                usuario.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
            }

            await VincularModistaAsync(id, dto.Rol, dto.ModistaId);

            await _context.SaveChangesAsync();
            return (true, "Usuario actualizado correctamente.");
        }
    }
}
