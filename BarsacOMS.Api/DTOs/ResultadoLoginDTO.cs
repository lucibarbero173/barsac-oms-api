namespace BarsacOMS.Api.DTOs
{
    public class ResultadoLoginDto
    {
        public bool Exito { get; set; }
        public string Mensaje { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;
        public UsuarioDto? Usuario { get; set; }
    }
}