namespace BarsacOMS.Api.Models
{
    // Un renglón del extracto del banco (o de Mercado Pago, Ualá...) cargado en Tesorería.
    // Importe con signo: positivo = entró plata a la cuenta, negativo = salió.
    public class ExtractoMovimiento
    {
        public int Id { get; set; }
        public string Cuenta { get; set; } = string.Empty;
        public DateTime Fecha { get; set; }
        public string Descripcion { get; set; } = string.Empty;
        public decimal Importe { get; set; }

        // Saldo que informa el banco después de este movimiento (si el extracto lo trae)
        public decimal? SaldoBanco { get; set; }

        // Para saber de qué carga vino (nombre del archivo o "Pegado"/"A mano")
        public string? Origen { get; set; }
        public DateTime FechaCarga { get; set; }

        // Null = todavía sin conciliar
        public int? ConciliacionBancoId { get; set; }
    }

    // Un "tilde" de conciliación: uno o más renglones del banco que se corresponden con uno o
    // más movimientos de Barsac (cobros, pagos, movimientos manuales) y suman lo mismo.
    public class ConciliacionBanco
    {
        public int Id { get; set; }
        public string Cuenta { get; set; } = string.Empty;
        public DateTime Fecha { get; set; }
        public int? UsuarioId { get; set; }
        public bool Automatica { get; set; }

        public List<ConciliacionBarsac> MovimientosBarsac { get; set; } = new();
    }

    // Qué movimiento de Barsac quedó conciliado. Origen: "Cobro" | "Pago" | "Manual".
    public class ConciliacionBarsac
    {
        public int Id { get; set; }
        public int ConciliacionBancoId { get; set; }
        public string Origen { get; set; } = string.Empty;
        public int OrigenId { get; set; }

        // Importe con signo al momento de conciliar (para detectar si después lo cambiaron)
        public decimal Importe { get; set; }
    }
}
