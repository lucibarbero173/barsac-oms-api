namespace BarsacOMS.Api.Models
{
    // Línea de ajuste manual dentro de una cuenta (ej: "Rendimientos", "Pase de Caja"),
    // para movimientos de plata que no quedan registrados en Cobros ni en Pagos.
    public class MovimientoManualCuenta
    {
        public int Id { get; set; }
        public string Cuenta { get; set; } = string.Empty;
        public DateTime Fecha { get; set; }
        public string Concepto { get; set; } = string.Empty;
        public decimal Monto { get; set; }
        public bool EsIngreso { get; set; }
    }
}
