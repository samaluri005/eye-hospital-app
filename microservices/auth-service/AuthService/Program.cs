using Microsoft.EntityFrameworkCore;
using AuthService.Data;
using Microsoft.OpenApi.Models;
using Twilio;
using Twilio.Rest.Api.V2010.Account;
using Twilio.Types;
using AuthService.Services;
using AuthService.Models;

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

// Configuration for OTP and external services
var twilioSid = builder.Configuration["TWILIO_ACCOUNT_SID"];
var twilioToken = builder.Configuration["TWILIO_AUTH_TOKEN"];
var twilioFrom = builder.Configuration["TWILIO_FROM_NUMBER"];
var otpSecret = builder.Configuration["OTP_HMAC_SECRET"];
var redisConn = builder.Configuration["REDIS_CONNECTION"];

RedisRateLimiter? rateLimiter = null;
try 
{
    if (!string.IsNullOrEmpty(redisConn)) 
    { 
        rateLimiter = new RedisRateLimiter(redisConn); 
        Console.WriteLine("Redis rate limiter initialized");
    }
    else 
    {
        Console.WriteLine("Redis connection not configured - rate limiting disabled");
    }
}
catch (Exception ex)
{
    Console.WriteLine($"Redis initialization failed: {ex.Message} - rate limiting disabled");
    rateLimiter = null;
}

if (!string.IsNullOrEmpty(twilioSid) && !string.IsNullOrEmpty(twilioToken))
    TwilioClient.Init(twilioSid, twilioToken);

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

app.MapPost("/signup/start", async (HttpContext http, AppDbContext db) =>
{
    var payload = await http.Request.ReadFromJsonAsync<Dictionary<string,string>>() ?? new();
    if (!payload.TryGetValue("phone", out var phone)) return Results.BadRequest(new { error = "phone required" });
    var ip = http.Connection.RemoteIpAddress?.ToString() ?? http.Request.Headers["x-forwarded-for"].FirstOrDefault() ?? "unknown";

    if (rateLimiter != null)
    {
        var ipCount = await rateLimiter.IncrementAsync($"rl:ip:{ip}", 60);
        if (ipCount > 60) return Results.StatusCode(429);
        var pcount = await rateLimiter.IncrementAsync($"rl:phone:{phone}", 15*60);
        if (pcount > 3) return Results.StatusCode(429);
    }

    var otp = AuthService.Services.OtpHelper.GenerateOtp();
    var nonce = AuthService.Services.OtpHelper.NewNonce();
    var hash = AuthService.Services.OtpHelper.ComputeHmac(otpSecret ?? "", otp, nonce);
    var expiresAt = DateTime.UtcNow.AddMinutes(5);

    var entry = new OtpAttempt {
      Phone = phone, OtpHash = hash, Nonce = nonce, ExpiresAt = expiresAt,
      Attempts = 0, ResendCount = 1, Status = "pending", CreatedAt = DateTime.UtcNow
    };
    db.OtpAttempts.Add(entry);
    await db.SaveChangesAsync();

    try {
        if (!string.IsNullOrEmpty(twilioSid) && !string.IsNullOrEmpty(twilioToken) && !string.IsNullOrEmpty(twilioFrom)) {
            await MessageResource.CreateAsync(body:$"Your verification code is {otp}", from:new PhoneNumber(twilioFrom), to:new PhoneNumber(phone));
        }
    } catch (Exception ex) { Console.WriteLine($"twilio error:{ex.Message}"); return Results.StatusCode(500); }

    return Results.Ok(new { status="otp_sent", expires_in=300 });
});

app.MapPost("/signup/verify", async (HttpContext http, AppDbContext db) => {
    var p = await http.Request.ReadFromJsonAsync<Dictionary<string,string>>() ?? new();
    if (!p.TryGetValue("phone", out var phone) || !p.TryGetValue("otp", out var otp)) return Results.BadRequest(new { error="phone+otp required" });

    var entry = await db.OtpAttempts.Where(x=>x.Phone==phone && x.Status=="pending").OrderByDescending(x=>x.CreatedAt).FirstOrDefaultAsync();
    if (entry==null) return Results.BadRequest(new { error="no_otp_found" });
    if (DateTime.UtcNow > entry.ExpiresAt) { entry.Status="expired"; await db.SaveChangesAsync(); return Results.BadRequest(new { error="otp_expired" }); }
    if (entry.Attempts >= 3) { entry.Status="failed"; await db.SaveChangesAsync(); return Results.StatusCode(429); }

    var expected = AuthService.Services.OtpHelper.ComputeHmac(otpSecret ?? "", otp, entry.Nonce ?? "");
    if (!string.Equals(expected, entry.OtpHash, StringComparison.OrdinalIgnoreCase)) { entry.Attempts++; await db.SaveChangesAsync(); return Results.BadRequest(new { error="invalid_otp", attemptsLeft = 3-entry.Attempts }); }

    // verified -> create or fetch patient
    var patient = await db.Patients.FirstOrDefaultAsync(x => x.Phone == phone);
    if (patient == null) {
        patient = new Patient { Phone = phone, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        db.Patients.Add(patient);
    }
    entry.Status = "verified";
    await db.SaveChangesAsync();

    db.AuditLogs.Add(new AuditLog { PatientId=patient.Id, Actor="system", Action="otp_verified", Details=$"{{\"phone\":\"{phone}\"}}", Ip=http.Connection.RemoteIpAddress?.ToString(), UserAgent=http.Request.Headers["User-Agent"].FirstOrDefault(), CreatedAt=DateTime.UtcNow });
    await db.SaveChangesAsync();

    return Results.Ok(new { status="verified", patientId = patient.Id });
});

app.Run();