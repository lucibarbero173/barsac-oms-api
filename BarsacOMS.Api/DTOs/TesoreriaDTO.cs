namespace BarsacOMS.Api.DTOs
{
    // Tarjeta de cada cuenta en Tesorería
    public class ResumenTesoreriaDto
    {
        public string Cuenta { get; set; } = string.Empty;
        public decimal SaldoBarsac { get; set; }

        // Último saldo que informó el banco en el extracto (si el extracto trae saldo)
        public decimal? SaldoBanco { get; set; }
        public DateTime? FechaSaldoBanco { get; set; }
        // Lo que dice Barsac a esa misma fecha, y la diferencia (lo que tiene que dar 0)
        public decimal? SaldoBarsacAlaFecha { get; set; }
        public decimal? Diferencia { get; set; }

        // Período que cubren los extractos cargados
        public DateTime? PrimerExtracto { get; set; }
        public DateTime? UltimoExtracto { get; set; }

        // Lo que falta tildar dentro del período de los extractos
        public int PendientesBanco { get; set; }
        public decimal ImportePendienteBanco { get; set; }
        public int PendientesBarsac { get; set; }
        public decimal ImportePendienteBarsac { get; set; }

        // Conciliaciones que dejaron de cuadrar (ej. después se cambió el importe de un cobro)
        public int ARevisar { get; set; }

        public int MovimientosExtracto { get; set; }
    }

    public class ExtractoDto
    {
        public int Id { get; set; }
        public DateTime Fecha { get; set; }
        public string Descripcion { get; set; } = string.Empty;
        public decimal Importe { get; set; }
        public decimal? SaldoBanco { get; set; }
        public string? Origen { get; set; }
        public DateTime FechaCarga { get; set; }
        public int? ConciliacionId { get; set; }
    }

    public class MovimientoBarsacDto
    {
        public string Origen { get; set; } = string.Empty; // Cobro | Pago | Manual
        public int OrigenId { get; set; }
        public DateTime Fecha { get; set; }
        public string Concepto { get; set; } = string.Empty;
        public string? Detalle { get; set; }
        public decimal Importe { get; set; } // con signo: + entró, - salió
        public int? ConciliacionId { get; set; }
    }

    public class ConciliacionARevisarDto
    {
        public int Id { get; set; }
        public DateTime Fecha { get; set; }
        public string Motivo { get; set; } = string.Empty;
    }

    public class PantallaConciliarDto
    {
        public List<ExtractoDto> Banco { get; set; } = new();
        public List<MovimientoBarsacDto> Barsac { get; set; } = new();
        public List<ConciliacionARevisarDto> ARevisar { get; set; } = new();
    }

    public class RenglonExtractoDto
    {
        public DateTime Fecha { get; set; }
        public string Descripcion { get; set; } = string.Empty;
        public decimal Importe { get; set; }
        public decimal? SaldoBanco { get; set; }
    }

    public class CargarExtractoDto
    {
        public string? Origen { get; set; }
        public List<RenglonExtractoDto> Movimientos { get; set; } = new();
    }

    public class ResultadoCargaExtractoDto
    {
        public int Cargados { get; set; }
        public int Repetidos { get; set; }
    }

    public class ReferenciaBarsacDto
    {
        public string Origen { get; set; } = string.Empty;
        public int OrigenId { get; set; }
    }

    public class ConciliarDto
    {
        public List<int> ExtractoIds { get; set; } = new();
        public List<ReferenciaBarsacDto> Barsac { get; set; } = new();
    }

    public class EliminarExtractoDto
    {
        public List<int> Ids { get; set; } = new();
    }

    public class GraficoTesoreriaDto
    {
        public List<string> Meses { get; set; } = new();
        public List<decimal> Ingresos { get; set; } = new();
        public List<decimal> Egresos { get; set; } = new();
        public List<decimal?> Saldo { get; set; } = new();
    }

    public class MovimientoTesoreriaDto
    {
        public DateTime Fecha { get; set; }
        public string Origen { get; set; } = string.Empty;
        public int OrigenId { get; set; }
        public string Concepto { get; set; } = string.Empty;
        public string? Detalle { get; set; }
        public decimal Ingreso { get; set; }
        public decimal Egreso { get; set; }
        public decimal? Saldo { get; set; }
        public bool Conciliado { get; set; }
    }
}
