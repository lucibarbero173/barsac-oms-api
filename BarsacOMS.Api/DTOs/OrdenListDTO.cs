using BarsacOMS.Api.Models;

namespace BarsacOMS.Api.DTOs
{
    public class OrdenListDTO
    {
        public int Id { get; set; }
        public DateTime FechaPedido { get; set; }

        public DateTime FechaEntrega { get; set; }
        public int ClienteId { get; set; }

        public string NombreCliente { get; set; }
        public string Solicitante { get; set; }
        public string Disciplina { get; set; }

        public int CantidadPrendas { get; set; }

        public decimal ImporteTotal { get; set; }
        public decimal Senas { get; set; }
        public decimal? OtrosCobros { get; set; }
        public decimal Saldo { get; set; }

        public EstadoOrden Estado { get; set; }

        // Cantidad de PrendaUnidad ya escaneadas en Control para esta orden. Sirve para
        // mostrar un estado "Control" mientras el escaneo está en progreso (todavía no
        // llegó al 100%, que es cuando el Estado ya pasa solo a ListoParaEntregar).
        public int PrendasControladas { get; set; }
    }
}
