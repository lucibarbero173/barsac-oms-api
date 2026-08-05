using System.Text.Json.Serialization; // <-- Asegurate de agregar este using arriba de todo

namespace BarsacOMS.Api.Models
{
    public enum TipoProveedor
    {
        Papel,
        Telas,
        Insumo_DTF_Impresion,
        Merceria,
        Packaging,
        Tecnico
    }

    public class Proveedor
    {
        public int Id { get; set; }
        public string Nombre { get; set; } = string.Empty;

        // 🔥 AGREGÁ ESTA LÍNEA ACÁ ARRIBA:
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public TipoProveedor Tipo { get; set; }

        public string Telefono { get; set; } = string.Empty;

        public List<MateriaPrima> MateriasPrimas { get; set; } = new();
    }
}