namespace BarsacOMS.Api.DTOs
{
    public class ResultadoActualizacionFicha
    {
        public bool Exito { get; set; }
        public List<string> Conflictos { get; set; } = new();
        public bool NoEncontrada { get; set; }
    }
}
