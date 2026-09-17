namespace BarsacOMS.Api.Models
{
    public enum EstadoCorte
    {
        Pendiente = 0,
        Completo = 1,
        Faltante = 2,
    }

    // Catálogo único de "partes" que pueden faltar, compartido entre todos los tipos de
    // prenda. El frontend filtra qué subconjunto mostrar según el producto (remera, campera,
    // short, calza, pollera), pero se guarda siempre contra este mismo enum para poder
    // sacar estadísticas de scrap cruzando cualquier prenda/pedido/fecha.
    public enum ParteFaltante
    {
        Frente = 0,
        Espalda = 1,
        Manga = 2,
        CuelloPuno = 3,
        Completa = 4,
        FrenteDerecho = 5,
        FrenteIzquierdo = 6,
        CuelloTapita = 7,
        Capucha = 8,
        CuloDerecho = 9,
        CuloIzquierdo = 10,
        LadoDerecho = 11,
        LadoIzquierdo = 12,
        ShortDerecho = 13,
        ShortIzquierdo = 14,
    }

    // Una fila por cada prenda física individual. El Id se usa directo como código de barras.
    // Atraviesa varias etapas en orden: Diseño -> Corte -> Control (escaneo).
    public class PrendaUnidad
    {
        public int Id { get; set; }

        public int DetalleFichaProduccionId { get; set; }

        // Etapa Diseño
        public bool DisenoListo { get; set; } = false;
        public DateTime? FechaDiseno { get; set; }
        public int? DisenoPorUsuarioId { get; set; }

        // Etapa Corte
        public EstadoCorte CorteEstado { get; set; } = EstadoCorte.Pendiente;
        public ParteFaltante? CorteParteFaltante { get; set; }
        public string? CorteDetalleFaltante { get; set; }
        public DateTime? FechaCorte { get; set; }
        public int? CortadoPorUsuarioId { get; set; }

        // Etapa Control (escaneo de Mirta)
        public bool Controlada { get; set; } = false;
        public DateTime? FechaControl { get; set; }
        public int? ControladoPorUsuarioId { get; set; }
    }
}
