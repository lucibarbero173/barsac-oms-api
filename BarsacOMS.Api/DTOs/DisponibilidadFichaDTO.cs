namespace BarsacOMS.Api.DTOs
{
    // Cuánto queda por repartir de cada producto del pedido entre sus fichas
    // (un pedido puede tener varias fichas = varias tandas de producción).
    // Se agrupa solo por producto: el talle del pedido es una categoría de precio
    // (ej. "NIÑO"/"ADULTO") que no coincide con el talle real de fabricación de la ficha.
    public class DisponibilidadLineaDto
    {
        public string Producto { get; set; } = string.Empty;
        public int CantidadPedida { get; set; }
        public int CantidadRepartida { get; set; }
        public int Disponible { get; set; }
    }

    // Resumen de las fichas que ya existen para un pedido, para mostrar contexto
    // al armar una ficha nueva sobre el mismo pedido.
    public class FichaResumenSimpleDto
    {
        public int FichaId { get; set; }
        public string? Modista { get; set; }
        public bool Entregada { get; set; }
        public List<string> Lineas { get; set; } = new();
    }

    public class DisponibilidadOrdenDto
    {
        public List<DisponibilidadLineaDto> Lineas { get; set; } = new();
        public List<FichaResumenSimpleDto> FichasExistentes { get; set; } = new();
    }
}
