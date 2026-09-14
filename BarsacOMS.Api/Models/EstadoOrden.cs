namespace BarsacOMS.Api.Models
{
    public enum EstadoOrden
    {
        Pendiente = 0,
        EnProceso = 1, // = "Diseño"
        Entregado = 2,
        ListoParaEntregar = 3,
        EntregadoParcial = 4,
        Corte = 5,
        CorteFaltantes = 6,
        AptoConfeccion = 7,
    }
}
