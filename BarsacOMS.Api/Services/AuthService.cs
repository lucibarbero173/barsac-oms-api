using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BarsacOMS.Api.Data;
using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Models;
using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace BarsacOMS.Api.Services
{
    public class AuthService : IAuthService
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthService(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
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

            // Generamos el token JWT
            string tokenGenerado = GenerarJwtToken(usuario);

            return new ResultadoLoginDto
            {
                Exito = true,
                Mensaje = "Login exitoso",
                Usuario = new UsuarioDto
                {
                    Id = usuario.Id,
                    Nombre = usuario.Nombre,
                    Email = usuario.Email,
                    Rol = usuario.Rol,
                    Activo = usuario.Activo,
                    CreatedAt = usuario.CreatedAt
                },
                Token = tokenGenerado // Asegúrate de tener la propiedad Token en ResultadoLoginDto
            };
        }

        private string GenerarJwtToken(Usuario usuario)
        {
            // Toma la clave desde appsettings.json (Jwt:Key) o de la variable de entorno JWT_KEY
            var jwtKey = _configuration["Jwt:Key"];
            if (string.IsNullOrEmpty(jwtKey))
            {
                jwtKey = Environment.GetEnvironmentVariable("JWT_KEY");
            }

            if (string.IsNullOrEmpty(jwtKey))
            {
                throw new InvalidOperationException("No se encontró la clave JWT. Configura 'Jwt:Key' en appsettings.json o la variable de entorno 'JWT_KEY'.");
            }

            var keyBytes = Encoding.UTF8.GetBytes(jwtKey);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
                new Claim(ClaimTypes.Email, usuario.Email),
                new Claim(ClaimTypes.Name, usuario.Nombre),
                new Claim(ClaimTypes.Role, usuario.Rol)
            };

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddHours(8), // Duración de la sesión
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(keyBytes), SecurityAlgorithms.HmacSha256Signature)
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var token = tokenHandler.CreateToken(tokenDescriptor);

            return tokenHandler.WriteToken(token);
        }
    }
}