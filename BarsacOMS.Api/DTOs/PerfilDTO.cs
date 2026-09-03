namespace BarsacOMS.Api.DTOs
{
    public class PerfilUsuarioDto
    {
        public int Id { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Rol { get; set; } = string.Empty;
        public string? FotoBase64 { get; set; }
    }

    public class ActualizarPerfilDto
    {
        public string Nombre { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? FotoBase64 { get; set; }

        // Solo si quiere cambiar la contraseña: hay que confirmar la actual.
        public string? PasswordActual { get; set; }
        public string? PasswordNueva { get; set; }
    }
}
