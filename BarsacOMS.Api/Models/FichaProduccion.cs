namespace BarsacOMS.Api.Models
{
    public class FichaProduccion
    {
        public int Id { get; set; }

        public int OrdenId { get; set; }
        public OrdenTrabajo Orden { get; set; }

        public string Modista { get; set; } // Ale, Tere, Vero, Loli, Beti, Sarita, Vicki

        public List<DetalleFichaProduccion> Items { get; set; } = new();
    }
}