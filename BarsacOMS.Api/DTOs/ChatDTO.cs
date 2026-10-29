namespace BarsacOMS.Api.DTOs
{
    // Quién está usando el chat (sale del token)
    public record UsuarioChat(int Id, string Nombre, string Rol);

    public class ConversacionChatDto
    {
        public string Canal { get; set; } = string.Empty;
        public string Titulo { get; set; } = string.Empty;
        public string Tipo { get; set; } = string.Empty; // general | estacion | modista
        public int NoLeidos { get; set; }
        public string? UltimoTexto { get; set; }
        public string? UltimoAutor { get; set; }
        public DateTime? UltimaFecha { get; set; } // hora de Argentina
    }

    public class MensajeChatDto
    {
        public int Id { get; set; }
        public string Canal { get; set; } = string.Empty;
        public int UsuarioId { get; set; }
        public string NombreUsuario { get; set; } = string.Empty;
        public string EstacionNombre { get; set; } = string.Empty;
        public string Texto { get; set; } = string.Empty;
        public DateTime Fecha { get; set; } // hora de Argentina
        public bool EsMio { get; set; }
    }

    public class EnviarMensajeChatDto
    {
        public string Canal { get; set; } = string.Empty;
        public string Texto { get; set; } = string.Empty;
    }

    public class MarcarLeidoChatDto
    {
        public string Canal { get; set; } = string.Empty;
        public int HastaId { get; set; }
    }
}
