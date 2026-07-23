using System.Text.Json.Serialization;

namespace BarsacOMS.Api.Models
{
    public class Cliente
    {
        public int Id { get; set; }
        public string Nombre { get; set; }
        public string Disciplina { get; set; }
        public string Telefono { get; set; }
        public string Solicitante { get; set; }
        public string ListaPrecios { get; set; }

        public string Localidad { get; set; }

        [JsonIgnore]
        public List<OrdenTrabajo>? Ordenes { get; set; } = new();
    }
}
