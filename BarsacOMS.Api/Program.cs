using Microsoft.EntityFrameworkCore;
using BarsacOMS.Api.Data;
using BarsacOMS.Api.Services;
using System.Text.Json.Serialization;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

// CONFIGURACIÓN DE BASE DE DATOS
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// REGISTRO DE SERVICIOS
builder.Services.AddScoped<IOrdenService, OrdenService>();
builder.Services.AddScoped<IProductoService, ProductoService>();
builder.Services.AddScoped<ICobroService, CobroService>();
builder.Services.AddScoped<IPagoService, PagoService>();
builder.Services.AddScoped<IAuthService, AuthService>(); // Reg. de Auth

// CONFIGURACIÓN DE AUTENTICACIÓN JWT
var jwtKey = builder.Configuration["Jwt:SecretKey"] ?? "ClaveSecretaSuperSeguraParaBarsacOMS2026!";
var keyBytes = Encoding.UTF8.GetBytes(jwtKey);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(keyBytes),
        ValidateIssuer = false,   // Podés cambiarlo a true si definís Issuer en appsettings
        ValidateAudience = false, // Podés cambiarlo a true si definís Audience en appsettings
        ValidateLifetime = true,  // Expira el token automáticamente
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// PERMITE CONEXIONES DE CUALQUIER FRONTEND / CLIENTE
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReact",
        policy =>
        {
            policy.AllowAnyOrigin()
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

// app.UseHttpsRedirection(); // Comentado para evitar inconvenientes con el proxy de Railway

app.UseCors("AllowReact");

// MIDDLEWARES DE AUTENTICACIÓN Y AUTORIZACIÓN (¡El orden importa!)
app.UseAuthentication(); // <-- 1° Identifica quién es el usuario
app.UseAuthorization();  // <-- 2° Verifica permisos

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapControllers();

app.Run();