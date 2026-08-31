using System.ComponentModel.DataAnnotations;

namespace BarsacOMS.Api.DTOs
{
    public class ActualizarUsuarioDto
    {
        [Required(ErrorMessage = "El nombre es obligatorio")]
        public string Nombre { get; set; } = string.Empty;

        [Required(ErrorMessage = "El rol es obligatorio")]
        public string Rol { get; set; } = string.Empty;

        public bool Activo { get; set; } = true;

        // Opcional: si viene con valor, se resetea la contraseña
        [MinLength(6, ErrorMessage = "La contraseña debe tener al menos 6 caracteres")]
        public string? Password { get; set; }
    }
}
