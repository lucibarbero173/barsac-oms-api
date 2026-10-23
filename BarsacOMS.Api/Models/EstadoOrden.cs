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
        Impresion = 8, // entre Diseño y Corte (se agregó después, por eso el número no sigue el orden)
    }

    // Orden REAL de las etapas de producción. No se puede comparar por el número del enum
    // porque Impresión (8) va antes que Corte (5).
    public static class EtapasProduccion
    {
        private static readonly EstadoOrden[] Orden =
        {
            EstadoOrden.Pendiente,
            EstadoOrden.EnProceso,
            EstadoOrden.Impresion,
            EstadoOrden.Corte,
            EstadoOrden.CorteFaltantes,
            EstadoOrden.AptoConfeccion,
        };

        // Los estados que puede tomar una ficha. Si la orden ya está en un estado de entrega
        // (Entregado/EntregadoParcial/ListoParaEntregar), los cambios de etapa no la pisan.
        public static readonly HashSet<EstadoOrden> EstadosDeProduccion = new(Orden);

        public static int Rango(EstadoOrden estado)
        {
            var i = Array.IndexOf(Orden, estado);
            return i >= 0 ? i : int.MaxValue;
        }

        // La etapa más atrasada entre varias fichas (= el estado que le corresponde a la orden)
        public static EstadoOrden MasAtrasada(IEnumerable<EstadoOrden> estados) =>
            estados.OrderBy(Rango).First();
    }
}
