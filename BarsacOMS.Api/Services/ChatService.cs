using BarsacOMS.Api.Data;
using BarsacOMS.Api.DTOs;
using BarsacOMS.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BarsacOMS.Api.Services
{
    // Chat interno. Hay un canal "general" para todas las estaciones de producción (sin las
    // modistas) y conversaciones privadas de a dos: estación con estación (diseño ↔ corte)
    // o estación con una modista. Las modistas no hablan entre ellas ni ven el general.
    public class ChatService : IChatService
    {
        private const string CanalGeneral = "general";
        private const int LargoMaximo = 2000;
        private static readonly TimeSpan OffsetArgentina = TimeSpan.FromHours(-3);

        // Estaciones que existen como "punta" de una conversación. Admin y super son la misma
        // estación (Administración), así cualquiera de las dos lee lo que le mandan.
        private static readonly Dictionary<string, string> Estaciones = new()
        {
            ["administracion"] = "Administración",
            ["gestion"] = "Gestión",
            ["control"] = "Control",
            ["diseno"] = "Diseño",
            ["impresion"] = "Impresión",
            ["corte"] = "Corte",
        };

        private readonly AppDbContext _context;

        public ChatService(AppDbContext context)
        {
            _context = context;
        }

        private static DateTime ALocal(DateTime utc) => utc + OffsetArgentina;

        private static bool EsModista(UsuarioChat u) => u.Rol == "modista";

        private static string PuntaDe(UsuarioChat u) => u.Rol switch
        {
            "admin" or "super" => "administracion",
            "modista" => $"u:{u.Id}",
            _ => u.Rol
        };

        private static string CanalPrivado(string a, string b) =>
            "dm:" + string.Join("|", new[] { a, b }.OrderBy(x => x, StringComparer.Ordinal));

        private static string NombreEstacion(string estacion) =>
            Estaciones.TryGetValue(estacion, out var n) ? n : (estacion.StartsWith("u:") ? "Modista" : estacion);

        // ¿Puede este usuario leer/escribir en este canal? Devuelve la otra punta (o null si es el general).
        private async Task<(bool Ok, string? Otra)> ValidarCanalAsync(UsuarioChat usuario, string canal)
        {
            if (canal == CanalGeneral) return (!EsModista(usuario), null);
            if (!canal.StartsWith("dm:")) return (false, null);

            var partes = canal.Substring(3).Split('|');
            if (partes.Length != 2 || canal != CanalPrivado(partes[0], partes[1])) return (false, null);

            var mia = PuntaDe(usuario);
            if (!partes.Contains(mia)) return (false, null);
            var otra = partes[0] == mia ? partes[1] : partes[0];
            if (otra == mia) return (false, null);

            if (Estaciones.ContainsKey(otra)) return (true, otra);

            // La otra punta es una modista: solo una estación puede hablarle, no otra modista
            if (EsModista(usuario) || !otra.StartsWith("u:") || !int.TryParse(otra.Substring(2), out var id))
                return (false, null);

            var existe = await _context.Usuarios.AnyAsync(u => u.Id == id && u.Rol == "modista");
            return (existe, otra);
        }

        public async Task<List<ConversacionChatDto>> ObtenerConversacionesAsync(UsuarioChat usuario)
        {
            var mia = PuntaDe(usuario);
            var conversaciones = new List<ConversacionChatDto>();

            if (!EsModista(usuario))
            {
                conversaciones.Add(new ConversacionChatDto { Canal = CanalGeneral, Titulo = "General", Tipo = "general" });
            }

            foreach (var (clave, nombre) in Estaciones)
            {
                if (clave == mia) continue;
                conversaciones.Add(new ConversacionChatDto { Canal = CanalPrivado(mia, clave), Titulo = nombre, Tipo = "estacion" });
            }

            if (!EsModista(usuario))
            {
                var modistas = await _context.Usuarios
                    .Where(u => u.Rol == "modista" && u.Activo)
                    .OrderBy(u => u.Nombre)
                    .Select(u => new { u.Id, u.Nombre })
                    .ToListAsync();

                foreach (var m in modistas)
                {
                    conversaciones.Add(new ConversacionChatDto { Canal = CanalPrivado(mia, $"u:{m.Id}"), Titulo = m.Nombre, Tipo = "modista" });
                }
            }

            var canales = conversaciones.Select(c => c.Canal).ToList();

            // Último mensaje de cada canal
            var ultimosIds = await _context.ChatMensajes
                .Where(m => canales.Contains(m.Canal))
                .GroupBy(m => m.Canal)
                .Select(g => g.Max(m => m.Id))
                .ToListAsync();

            var ultimos = await _context.ChatMensajes
                .Where(m => ultimosIds.Contains(m.Id))
                .ToDictionaryAsync(m => m.Canal);

            // No leídos: mensajes de otros después del último que leí. Si nunca abrí el canal,
            // cuentan solo los que llegaron después de que se creó mi usuario (no todo el historial).
            var creado = await _context.Usuarios.Where(u => u.Id == usuario.Id).Select(u => u.CreatedAt).FirstOrDefaultAsync();

            var noLeidos = await (
                from m in _context.ChatMensajes
                where canales.Contains(m.Canal) && m.UsuarioId != usuario.Id
                join l in _context.ChatLecturas.Where(l => l.UsuarioId == usuario.Id) on m.Canal equals l.Canal into ls
                from l in ls.DefaultIfEmpty()
                where l != null ? m.Id > l.UltimoMensajeLeidoId : m.Fecha >= creado
                group m by m.Canal into g
                select new { Canal = g.Key, Cantidad = g.Count() }
            ).ToDictionaryAsync(x => x.Canal, x => x.Cantidad);

            foreach (var c in conversaciones)
            {
                if (ultimos.TryGetValue(c.Canal, out var u))
                {
                    c.UltimoTexto = u.Texto.Length > 80 ? u.Texto.Substring(0, 80) + "…" : u.Texto;
                    c.UltimoAutor = u.NombreUsuario;
                    c.UltimaFecha = ALocal(u.Fecha);
                }
                c.NoLeidos = noLeidos.TryGetValue(c.Canal, out var n) ? n : 0;
            }

            // El general siempre arriba; después lo más reciente; lo que nunca se usó, al final
            return conversaciones
                .OrderBy(c => c.Tipo == "general" ? 0 : 1)
                .ThenByDescending(c => c.UltimaFecha ?? DateTime.MinValue)
                .ThenBy(c => c.Tipo == "estacion" ? 0 : 1)
                .ToList();
        }

        public async Task<(bool Ok, List<MensajeChatDto> Mensajes)> ObtenerMensajesAsync(UsuarioChat usuario, string canal, int? despuesDe)
        {
            var (ok, _) = await ValidarCanalAsync(usuario, canal);
            if (!ok) return (false, new List<MensajeChatDto>());

            var query = _context.ChatMensajes.Where(m => m.Canal == canal);

            List<ChatMensaje> mensajes;
            if (despuesDe.HasValue)
            {
                mensajes = await query.Where(m => m.Id > despuesDe.Value).OrderBy(m => m.Id).Take(200).ToListAsync();
            }
            else
            {
                // Al abrir la conversación: los últimos 100
                mensajes = await query.OrderByDescending(m => m.Id).Take(100).ToListAsync();
                mensajes.Reverse();
            }

            return (true, mensajes.Select(m => ADto(m, usuario)).ToList());
        }

        public async Task<(MensajeChatDto? Mensaje, string? Error)> EnviarAsync(UsuarioChat usuario, EnviarMensajeChatDto dto)
        {
            var texto = (dto.Texto ?? "").Trim();
            if (texto.Length == 0) return (null, "El mensaje está vacío.");
            if (texto.Length > LargoMaximo) return (null, $"El mensaje es muy largo (máximo {LargoMaximo} caracteres).");

            var (ok, _) = await ValidarCanalAsync(usuario, dto.Canal);
            if (!ok) return (null, "No podés escribir en esta conversación.");

            var mensaje = new ChatMensaje
            {
                Canal = dto.Canal,
                UsuarioId = usuario.Id,
                NombreUsuario = usuario.Nombre,
                Estacion = PuntaDe(usuario),
                Texto = texto,
                Fecha = DateTime.UtcNow
            };

            _context.ChatMensajes.Add(mensaje);
            await _context.SaveChangesAsync();

            // Lo que mando yo ya está leído por mí
            await MarcarLeidoInternoAsync(usuario.Id, dto.Canal, mensaje.Id);

            return (ADto(mensaje, usuario), null);
        }

        public async Task<bool> MarcarLeidoAsync(UsuarioChat usuario, string canal, int hastaId)
        {
            var (ok, _) = await ValidarCanalAsync(usuario, canal);
            if (!ok) return false;

            await MarcarLeidoInternoAsync(usuario.Id, canal, hastaId);
            return true;
        }

        private async Task MarcarLeidoInternoAsync(int usuarioId, string canal, int hastaId)
        {
            var lectura = await _context.ChatLecturas.FirstOrDefaultAsync(l => l.UsuarioId == usuarioId && l.Canal == canal);
            if (lectura == null)
            {
                _context.ChatLecturas.Add(new ChatLectura { UsuarioId = usuarioId, Canal = canal, UltimoMensajeLeidoId = hastaId });
            }
            else if (hastaId > lectura.UltimoMensajeLeidoId)
            {
                lectura.UltimoMensajeLeidoId = hastaId;
            }
            else
            {
                return;
            }

            await _context.SaveChangesAsync();
        }

        private static MensajeChatDto ADto(ChatMensaje m, UsuarioChat usuario) => new()
        {
            Id = m.Id,
            Canal = m.Canal,
            UsuarioId = m.UsuarioId,
            NombreUsuario = m.NombreUsuario,
            EstacionNombre = NombreEstacion(m.Estacion),
            Texto = m.Texto,
            Fecha = ALocal(m.Fecha),
            EsMio = m.UsuarioId == usuario.Id
        };
    }
}
