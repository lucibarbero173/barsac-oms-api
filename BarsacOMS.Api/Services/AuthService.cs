using BarsacOMS.Api.Data;
using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Models;
using BCrypt.Net;
using Microsoft.EntityFrameworkCore;

namespace BarsacOMS.Api.Services
{
    public class AuthService : IAuthService
    {
        private readonly AppDbContext _context;

        public AuthService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<(bool Exito, string Mensaje)> RegistrarUsuarioAsync(RegisterDto dto)
        {
            // 1. Verificamos si el correo ya existe
            var existeEmail = await _context.Usuarios
                .AnyAsync(u => u.Email.ToLower() == dto.Email.ToLower().Trim());

            if (existeEmail)
            {
                return (false, "El correo electrónico ya se encuentra registrado.");
            }

            // 2. Encriptamos la contraseña usando BCrypt
            string passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);

            // 3. Guardamos el usuario
            var usuario = new Usuario
            {
                Nombre = dto.Nombre.Trim(),
                Email = dto.Email.ToLower().Trim(),
                PasswordHash = passwordHash,
                Rol = "usuario", // Arranca como usuario normal
                Activo = true
            };

            _context.Usuarios.Add(usuario);
            await _context.SaveChangesAsync();

            return (true, "Usuario registrado correctamente.");
        }

        public async Task<ResultadoLoginDto> LoginAsync(LoginDto dto)
        {
            var usuario = await _context.Usuarios
                .FirstOrDefaultAsync(u => u.Email.ToLower() == dto.Email.ToLower() && u.Activo);

            if (usuario == null || !BCrypt.Net.BCrypt.Verify(dto.Password, usuario.PasswordHash))
            {
                return new ResultadoLoginDto { Exito = false, Mensaje = "Credenciales incorrectas." };
            }

            if (usuario.Rol != "admin")
            {
                return new ResultadoLoginDto { Exito = false, Mensaje = "Acceso denegado. Se requieren permisos de administrador." };
            }

            // Por ahora enviamos ok. Más adelante cuando configuremos JWT, acá generamos el token.
            return new ResultadoLoginDto
            {
                Exito = true,
                Mensaje = "Login exitoso",
                Usuario = usuario
            };
        }
    }
}