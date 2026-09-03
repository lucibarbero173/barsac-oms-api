namespace BarsacOMS.Api.Models
{
    // Saldo de arranque de una cuenta (Efectivo, Mercado Pago, UALA, ICBC) a una fecha de corte.
    // A partir de ahí, el saldo corriente se calcula solo con los Cobros/Pagos/movimientos manuales.
    public class SaldoInicialCuenta
    {
        public int Id { get; set; }
        public string Cuenta { get; set; } = string.Empty;
        public DateTime Fecha { get; set; }
        public decimal Monto { get; set; }
    }
}
