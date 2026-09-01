namespace BarsacOMS.Api.Models
{
    // "Productivo": Diseño, Corte, Calandra, Despacho, etc. (se relaciona con producción).
    // "Otro": Sueldos administrativos, alquiler, impuestos, etc.
    public enum TipoGastoGeneral
    {
        Productivo = 0,
        Otro = 1
    }

    // Gasto mensual compartido entre todos los productos. La suma de todos estos,
    // dividida por la producción mensual estimada, da el costo compartido por prenda.
    public class GastoGeneral
    {
        public int Id { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public decimal MontoMensual { get; set; }
        public TipoGastoGeneral Tipo { get; set; }
    }
}
