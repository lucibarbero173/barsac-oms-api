using System.Text.Json.Serialization; // <-- Asegurate de agregar este using arriba de todo

namespace BarsacOMS.Api.Models
{
    public class Proveedor
    {
        public int Id { get; set; }
        public string Nombre { get; set; } = string.Empty;

        public string Tipo { get; set; } = string.Empty; // 👈 Manejado directamente como texto

        public string Telefono { get; set; } = string.Empty;

        public List<MateriaPrima> MateriasPrimas { get; set; } = new();
    }
}