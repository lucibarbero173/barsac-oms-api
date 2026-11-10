using System.Globalization;
using BarsacOMS.Api.Data;
using BarsacOMS.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BarsacOMS.Api.Services
{
    // Chequeos antes de borrar algo que otras pantallas usan: si se borra, la cascada de la
    // base se lleva fichas, prendas cosidas, pagos a modistas, etc. sin que nadie se entere.
    public static class ControlBorrados
    {
        private static readonly CultureInfo Ar = new("es-AR");

        public static string Moneda(decimal importe) => "$ " + importe.ToString("N0", Ar);

        // Qué avance de producción tienen estas fichas, en palabras. Null = ninguno (se pueden borrar).
        public static async Task<string?> AvanceDeFichasAsync(AppDbContext context, List<int> fichaIds)
        {
            if (fichaIds.Count == 0) return null;

            var unidades = await (
                from d in context.DetallesFichaProduccion
                where fichaIds.Contains(d.FichaProduccionId)
                join u in context.PrendasUnidad on d.Id equals u.DetalleFichaProduccionId
                select new { u.DisenoListo, u.CorteEstado, u.ModistaId, u.Cosida, u.PagoModistaId, u.Controlada }
            ).ToListAsync();

            var impresas = await context.FichasProduccion.CountAsync(f => fichaIds.Contains(f.Id) && f.FechaImpresion != null);
            var extras = await context.PrendasExtraModista.CountAsync(e => fichaIds.Contains(e.FichaProduccionId));

            var partes = new List<string>();
            void Sumar(int n, string uno, string varios) { if (n > 0) partes.Add($"{n} {(n == 1 ? uno : varios)}"); }

            Sumar(unidades.Count(u => u.DisenoListo), "prenda con diseño listo", "prendas con diseño listo");
            Sumar(impresas, "ficha impresa", "fichas impresas");
            Sumar(unidades.Count(u => u.CorteEstado != EstadoCorte.Pendiente), "prenda cortada", "prendas cortadas");
            Sumar(unidades.Count(u => u.ModistaId != null), "prenda asignada a una modista", "prendas asignadas a modistas");
            Sumar(unidades.Count(u => u.Cosida), "prenda cosida", "prendas cosidas");
            Sumar(unidades.Count(u => u.PagoModistaId != null), "prenda ya pagada a la modista", "prendas ya pagadas a modistas");
            Sumar(unidades.Count(u => u.Controlada), "prenda controlada", "prendas controladas");
            Sumar(extras, "carga de \"cosí de más\"", "cargas de \"cosí de más\"");

            return partes.Count == 0 ? null : string.Join(", ", partes);
        }
    }
}
