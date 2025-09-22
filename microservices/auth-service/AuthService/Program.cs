using Microsoft.EntityFrameworkCore;
using AuthService.Data;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Load DB connection from configuration or env var
// Use appsettings.Development.json for local dev or set env var ConnectionStrings__DefaultConnection
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrEmpty(connectionString))
{
    Console.WriteLine("WARNING: No DefaultConnection found in configuration. Ensure env var ConnectionStrings__DefaultConnection is set.");
}

// Add DbContext
builder.Services.AddDbContext<AppDbContext>(opts =>
    opts.UseNpgsql(connectionString));

// add minimal services
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

// Simple health
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

// Quick DB sanity endpoint
app.MapGet("/db/tables", async (AppDbContext db) =>
{
    var patients = await db.Patients.CountAsync();
    var otps = await db.OtpAttempts.CountAsync();
    return Results.Ok(new { patients, otps });
});

app.Run();