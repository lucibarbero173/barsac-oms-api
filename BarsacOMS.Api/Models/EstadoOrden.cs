namespace BarsacOMS.Api.Models
{
    public enum EstadoOrden
    {
        Pendiente = 0,
        EnProceso = 1,
        Finalizado = 2,
        Entregado = 3,
        ListoParaEntregar = 4,
        EntregadoParcial = 5,
        Cancelado = 6
    }
}
