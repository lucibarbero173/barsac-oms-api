namespace BarsacOMS.Api.DTOs
{
    public class ResumenCuentaDto
    {
        public string Cuenta { get; set; } = string.Empty;
        public decimal SaldoActual { get; set; }
    }

    // Una fila del libro de una cuenta: puede venir de un Cobro, un Pago o un movimiento manual.
    public class MovimientoCuentaDto
    {
        public DateTime Fecha { get; set; }
        public string Concepto { get; set; } = string.Empty;
        public decimal Ingreso { get; set; }
        public decimal Egreso { get; set; }
        public decimal Saldo { get; set; }
        public string Origen { get; set; } = string.Empty; // "SaldoInicial" | "Cobro" | "Pago" | "Manual"
        public int? MovimientoManualId { get; set; } // solo si Origen == "Manual", para poder editar/borrar
    }

    public class GuardarSaldoInicialDto
    {
        public DateTime Fecha { get; set; }
        public decimal Monto { get; set; }
    }

    public class GuardarMovimientoManualDto
    {
        public string Cuenta { get; set; } = string.Empty;
        public DateTime Fecha { get; set; }
        public string Concepto { get; set; } = string.Empty;
        public decimal Monto { get; set; }
        public bool EsIngreso { get; set; }
    }
}
