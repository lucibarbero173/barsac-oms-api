namespace BarsacOMS.Api.Models
{
    // Un mensaje del chat interno. Canal = "general" o una conversación privada entre dos
    // estaciones: "dm:corte|diseno" (las dos puntas ordenadas). Una modista es una punta
    // propia, "u:{usuarioId}", porque cada modista habla por sí misma, no como estación.
    public class ChatMensaje
    {
        public int Id { get; set; }
        public string Canal { get; set; } = string.Empty;
        public int UsuarioId { get; set; }
        public string NombreUsuario { get; set; } = string.Empty;

        // Desde qué estación lo mandó (ej. "diseno"), para mostrar "Ema · Diseño"
        public string Estacion { get; set; } = string.Empty;
        public string Texto { get; set; } = string.Empty;
        public DateTime Fecha { get; set; }
    }

    // Hasta qué mensaje leyó cada usuario en cada canal (para el globito de no leídos)
    public class ChatLectura
    {
        public int Id { get; set; }
        public int UsuarioId { get; set; }
        public string Canal { get; set; } = string.Empty;
        public int UltimoMensajeLeidoId { get; set; }
    }
}
