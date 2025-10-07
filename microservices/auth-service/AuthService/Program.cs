using Microsoft.EntityFrameworkCore;
using AuthService.Data;
using Microsoft.OpenApi.Models;
using Twilio;
using Twilio.Rest.Api.V2010.Account;
using Twilio.Types;
using AuthService.Services;
using AuthService.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Identity.Web;

var builder = WebApplication.CreateBuilder(args);

// Load DB connection from configuration or env var
// Use appsettings.Development.json for local dev or set env var ConnectionStrings__DefaultConnection
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrEmpty(connectionString))
{
    Console.WriteLine("WARNING: No DefaultConnection found in configuration. Ensure env var ConnectionStrings__DefaultConnection is set.");
}

// Add connection pooling and resilience parameters
if (!string.IsNullOrEmpty(connectionString))
{
    var connBuilder = new Npgsql.NpgsqlConnectionStringBuilder(connectionString)
    {
        Pooling = true,
        MinPoolSize = 1,
        MaxPoolSize = 20,
        ConnectionIdleLifetime = 300,
        ConnectionPruningInterval = 10,
        Timeout = 30,
        CommandTimeout = 30,
        KeepAlive = 30
    };
    connectionString = connBuilder.ToString();
}

// Add DbContext with connection resilience
builder.Services.AddDbContext<AppDbContext>(opts =>
{
    opts.UseNpgsql(connectionString, npgsqlOptions =>
    {
        npgsqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(10),
            errorCodesToAdd: null);
        npgsqlOptions.CommandTimeout(30);
    });
    opts.EnableSensitiveDataLogging(false);
    opts.EnableDetailedErrors(false);
});

// add minimal services
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// NOTE: Azure AD authentication commented out - OTP endpoints are public/anonymous
// Uncomment if you need authenticated endpoints in the future
// builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
//   .AddMicrosoftIdentityWebApi(builder.Configuration.GetSection("AzureAd"));
// builder.Services.AddAuthorization();

// Add CORS to allow frontend access
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(builder =>
    {
        builder
            .WithOrigins("https://17791e9b-5553-473f-90c6-ebc465f8543f-00-3l7xmxdpueco.sisko.replit.dev")
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
    });
});

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

// Enable CORS
app.UseCors();

// Authentication/Authorization middleware commented out (not needed for OTP endpoints)
// app.UseAuthentication();
// app.UseAuthorization();

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
    if (entry.Attempts >= 3) { entry.Status="failed"; await db.SaveChangesAsync(); return Results.BadRequest(new { error="max_attempts_exceeded", message="Too many incorrect attempts. Please request a new OTP." }); }

    var expected = AuthService.Services.OtpHelper.ComputeHmac(otpSecret ?? "", otp, entry.Nonce ?? "");
    if (!string.Equals(expected, entry.OtpHash, StringComparison.OrdinalIgnoreCase)) { entry.Attempts++; await db.SaveChangesAsync(); return Results.BadRequest(new { error="invalid_otp", attemptsLeft = 3-entry.Attempts }); }

    entry.Status = "verified";
    await db.SaveChangesAsync();

    // Find all patients associated with this phone number
    // 1. Primary accounts (phone matches)
    var primaryPatients = await db.Patients.Where(x => x.Phone == phone).ToListAsync();
    
    // 2. Family member accounts (guardianPatientId matches any primary patient)
    var primaryIds = primaryPatients.Select(p => p.Id).ToList();
    var familyAccesses = await db.FamilyAccesses
        .Where(fa => primaryIds.Contains(fa.GuardianPatientId) && fa.IsActive)
        .ToListAsync();
    
    var familyPatientIds = familyAccesses.Select(fa => fa.PatientId).ToList();
    var familyPatients = await db.Patients.Where(p => familyPatientIds.Contains(p.Id)).ToListAsync();
    
    // Build account list
    var accounts = new List<object>();
    
    // Add primary accounts
    foreach (var pt in primaryPatients)
    {
        var hasProfile = !string.IsNullOrEmpty(pt.FullName) && pt.DateOfBirth != null;
        accounts.Add(new
        {
            patientId = pt.Id,
            upi = pt.Upi,
            name = pt.FullName ?? "Incomplete Profile",
            relationship = "Primary",
            isPrimary = true,
            hasProfile = hasProfile
        });
    }
    
    // Add family member accounts
    foreach (var fa in familyAccesses)
    {
        var pt = familyPatients.FirstOrDefault(p => p.Id == fa.PatientId);
        if (pt != null)
        {
            var hasProfile = !string.IsNullOrEmpty(pt.FullName) && pt.DateOfBirth != null;
            accounts.Add(new
            {
                patientId = pt.Id,
                upi = pt.Upi,
                name = pt.FullName ?? "Incomplete Profile",
                relationship = fa.Relationship,
                isPrimary = false,
                hasProfile = hasProfile,
                guardianPatientId = fa.GuardianPatientId
            });
        }
    }
    
    // If no accounts exist, create a new primary patient
    Guid primaryPatientId;
    if (accounts.Count == 0)
    {
        var newPatient = new Patient { Phone = phone, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        db.Patients.Add(newPatient);
        await db.SaveChangesAsync();
        primaryPatientId = newPatient.Id;
        
        accounts.Add(new
        {
            patientId = newPatient.Id,
            upi = newPatient.Upi,
            name = "Incomplete Profile",
            relationship = "Primary",
            isPrimary = true,
            hasProfile = false
        });
    }
    else
    {
        // Use first primary patient as the default
        primaryPatientId = primaryPatients.FirstOrDefault()?.Id ?? Guid.Empty;
    }

    // Create short-lived link token for account selection (10 minutes)
    var linkSecret = builder.Configuration["LINK_TOKEN_HMAC_SECRET"] ?? otpSecret;
    if (string.IsNullOrEmpty(linkSecret))
    {
        Console.WriteLine("LINK_TOKEN_HMAC_SECRET not set - cannot create link token");
        return Results.StatusCode(500);
    }

    var linkToken = await AuthService.Services.LinkTokenHelper.CreateAndStoreLinkTokenAsync(
        db, primaryPatientId, linkSecret, TimeSpan.FromMinutes(10));

    // Audit log
    db.AuditLogs.Add(new AuditLog { PatientId=primaryPatientId, Actor="system", Action="otp_verified", Details=$"{{\"phone\":\"{phone}\",\"accountCount\":{accounts.Count}}}", Ip=http.Connection.RemoteIpAddress?.ToString(), UserAgent=http.Request.Headers["User-Agent"].FirstOrDefault(), CreatedAt=DateTime.UtcNow });
    await db.SaveChangesAsync();

    return Results.Ok(new { 
        status="verified", 
        accountCount = accounts.Count,
        accounts = accounts,
        primaryPatientId = primaryPatientId,
        linkToken = linkToken 
    });
});

// POST /signup/start-email - Send OTP to email address
app.MapPost("/signup/start-email", async (HttpContext http, AppDbContext db) =>
{
    var payload = await http.Request.ReadFromJsonAsync<Dictionary<string,string>>() ?? new();
    if (!payload.TryGetValue("email", out var email)) return Results.BadRequest(new { error = "email required" });
    var ip = http.Connection.RemoteIpAddress?.ToString() ?? http.Request.Headers["x-forwarded-for"].FirstOrDefault() ?? "unknown";

    if (rateLimiter != null)
    {
        var ipCount = await rateLimiter.IncrementAsync($"rl:ip:{ip}", 60);
        if (ipCount > 60) return Results.StatusCode(429);
        var ecount = await rateLimiter.IncrementAsync($"rl:email:{email}", 15*60);
        if (ecount > 3) return Results.StatusCode(429);
    }

    var otp = AuthService.Services.OtpHelper.GenerateOtp();
    var nonce = AuthService.Services.OtpHelper.NewNonce();
    var hash = AuthService.Services.OtpHelper.ComputeHmac(otpSecret ?? "", otp, nonce);
    var expiresAt = DateTime.UtcNow.AddMinutes(5);

    var entry = new OtpAttempt {
      Email = email, OtpHash = hash, Nonce = nonce, ExpiresAt = expiresAt,
      Attempts = 0, ResendCount = 1, Status = "pending", CreatedAt = DateTime.UtcNow
    };
    db.OtpAttempts.Add(entry);
    await db.SaveChangesAsync();

    // TODO: Send email via email service (SMTP, SendGrid, etc.)
    // Email delivery should be implemented using a secure email provider
    // DO NOT log OTP values to console - security violation

    return Results.Ok(new { status="otp_sent", expires_in=300 });
});

// POST /signup/verify-email - Verify email OTP
app.MapPost("/signup/verify-email", async (HttpContext http, AppDbContext db) => {
    var p = await http.Request.ReadFromJsonAsync<Dictionary<string,string>>() ?? new();
    if (!p.TryGetValue("email", out var email) || !p.TryGetValue("otp", out var otp)) return Results.BadRequest(new { error="email+otp required" });

    var entry = await db.OtpAttempts.Where(x=>x.Email==email && x.Status=="pending").OrderByDescending(x=>x.CreatedAt).FirstOrDefaultAsync();
    if (entry==null) return Results.BadRequest(new { error="no_otp_found" });
    if (DateTime.UtcNow > entry.ExpiresAt) { entry.Status="expired"; await db.SaveChangesAsync(); return Results.BadRequest(new { error="otp_expired" }); }
    if (entry.Attempts >= 3) { entry.Status="failed"; await db.SaveChangesAsync(); return Results.BadRequest(new { error="max_attempts_exceeded", message="Too many incorrect attempts. Please request a new OTP." }); }

    var expected = AuthService.Services.OtpHelper.ComputeHmac(otpSecret ?? "", otp, entry.Nonce ?? "");
    if (!string.Equals(expected, entry.OtpHash, StringComparison.OrdinalIgnoreCase)) { entry.Attempts++; await db.SaveChangesAsync(); return Results.BadRequest(new { error="invalid_otp", attemptsLeft = 3-entry.Attempts }); }

    entry.Status = "verified";
    await db.SaveChangesAsync();

    // Find all patients associated with this email address
    var primaryPatients = await db.Patients.Where(x => x.Email == email).ToListAsync();
    
    // Family member accounts via primary patients
    var primaryIds = primaryPatients.Select(p => p.Id).ToList();
    var familyAccesses = await db.FamilyAccesses
        .Where(fa => primaryIds.Contains(fa.GuardianPatientId) && fa.IsActive)
        .ToListAsync();
    
    var familyPatientIds = familyAccesses.Select(fa => fa.PatientId).ToList();
    var familyPatients = await db.Patients.Where(p => familyPatientIds.Contains(p.Id)).ToListAsync();
    
    // Build account list
    var accounts = new List<object>();
    
    // Add primary accounts
    foreach (var pt in primaryPatients)
    {
        var hasProfile = !string.IsNullOrEmpty(pt.FullName) && pt.DateOfBirth != null;
        accounts.Add(new
        {
            patientId = pt.Id,
            upi = pt.Upi,
            name = pt.FullName ?? "Incomplete Profile",
            relationship = "Primary",
            isPrimary = true,
            hasProfile = hasProfile
        });
    }
    
    // Add family member accounts
    foreach (var fa in familyAccesses)
    {
        var pt = familyPatients.FirstOrDefault(p => p.Id == fa.PatientId);
        if (pt != null)
        {
            var hasProfile = !string.IsNullOrEmpty(pt.FullName) && pt.DateOfBirth != null;
            accounts.Add(new
            {
                patientId = pt.Id,
                upi = pt.Upi,
                name = pt.FullName ?? "Incomplete Profile",
                relationship = fa.Relationship,
                isPrimary = false,
                hasProfile = hasProfile,
                guardianPatientId = fa.GuardianPatientId
            });
        }
    }
    
    // If no accounts exist, create a new primary patient
    Guid primaryPatientId;
    if (accounts.Count == 0)
    {
        var newPatient = new Patient { Email = email, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        db.Patients.Add(newPatient);
        await db.SaveChangesAsync();
        primaryPatientId = newPatient.Id;
        
        accounts.Add(new
        {
            patientId = newPatient.Id,
            upi = newPatient.Upi,
            name = "Incomplete Profile",
            relationship = "Primary",
            isPrimary = true,
            hasProfile = false
        });
    }
    else
    {
        // Use first primary patient as the default
        primaryPatientId = primaryPatients.FirstOrDefault()?.Id ?? Guid.Empty;
    }

    // Create short-lived link token for account selection (10 minutes)
    var linkSecret = builder.Configuration["LINK_TOKEN_HMAC_SECRET"] ?? otpSecret;
    if (string.IsNullOrEmpty(linkSecret))
    {
        Console.WriteLine("LINK_TOKEN_HMAC_SECRET not set - cannot create link token");
        return Results.StatusCode(500);
    }

    var linkToken = await AuthService.Services.LinkTokenHelper.CreateAndStoreLinkTokenAsync(
        db, primaryPatientId, linkSecret, TimeSpan.FromMinutes(10));

    // Audit log
    db.AuditLogs.Add(new AuditLog { PatientId=primaryPatientId, Actor="system", Action="email_otp_verified", Details=$"{{\"email\":\"{email}\",\"accountCount\":{accounts.Count}}}", Ip=http.Connection.RemoteIpAddress?.ToString(), UserAgent=http.Request.Headers["User-Agent"].FirstOrDefault(), CreatedAt=DateTime.UtcNow });
    await db.SaveChangesAsync();

    return Results.Ok(new { 
        status="verified", 
        accountCount = accounts.Count,
        accounts = accounts,
        primaryPatientId = primaryPatientId,
        linkToken = linkToken 
    });
});

// 🔗 SECURE ENDPOINT: Link Microsoft identity to patient account using LinkToken
app.MapPost("/auth/link", async (HttpContext http, AppDbContext db) =>
{
    var body = await http.Request.ReadFromJsonAsync<Dictionary<string,string>>() ?? new();
    if (!body.TryGetValue("patientId", out var patientIdStr) || !Guid.TryParse(patientIdStr, out var patientGuid))
        return Results.BadRequest(new { error = "patientId required" });

    if (!body.TryGetValue("linkToken", out var linkTokenPlain) || string.IsNullOrWhiteSpace(linkTokenPlain))
        return Results.BadRequest(new { error = "linkToken required" });

    // Get signed-in user's object ID (oid) or sub as fallback
    var oid = http.User.FindFirst("oid")?.Value ?? http.User.FindFirst("sub")?.Value;
    if (string.IsNullOrEmpty(oid)) 
        return Results.Unauthorized();

    // Validate link token
    var linkSecret = builder.Configuration["LINK_TOKEN_HMAC_SECRET"] ?? otpSecret;
    if (string.IsNullOrEmpty(linkSecret)) 
        return Results.StatusCode(500);

    var isValidToken = await AuthService.Services.LinkTokenHelper.ValidateAndConsumeLinkTokenAsync(
        db, patientGuid, linkTokenPlain, linkSecret);
    
    if (!isValidToken) 
        return Results.BadRequest(new { error="invalid_or_expired_link_token" });

    // Prevent linking same provider subject twice
    var existingIdentity = await db.AuthIdentities
        .FirstOrDefaultAsync(a => a.Provider == "Microsoft" && a.ProviderSubject == oid);
    
    if (existingIdentity != null)
    {
        return Results.Conflict(new { error="identity_already_linked", message="This Microsoft account is already linked to a patient account." });
    }

    // Create new AuthIdentity linking
    var authIdentity = new AuthIdentity {
        PatientId = patientGuid,
        Provider = "Microsoft",
        ProviderSubject = oid,
        VerifiedAt = DateTime.UtcNow,
        IsPrimary = true,
        IsActive = true,
        CreatedAt = DateTime.UtcNow
    };
    db.AuthIdentities.Add(authIdentity);

    // Audit the linking event
    db.AuditLogs.Add(new AuditLog {
        PatientId = patientGuid,
        Actor = oid,
        Action = "identity_linked",
        Details = $"{{\"provider\":\"Microsoft\",\"oid\":\"{oid}\"}}",
        Ip = http.Connection.RemoteIpAddress?.ToString(),
        UserAgent = http.Request.Headers["User-Agent"].FirstOrDefault(),
        CreatedAt = DateTime.UtcNow
    });

    await db.SaveChangesAsync();

    return Results.Ok(new { status="linked", message="Microsoft account successfully linked to patient profile." });
}).RequireAuthorization();

// GET patient profile with JWT authentication
app.MapGet("/api/patient", async (HttpContext http, AppDbContext db) => {
    // Get patient ID from JWT claims or linked identity
    var userClaims = http.User;
    var oid = userClaims.FindFirst("oid")?.Value; // Object ID from Azure AD
    
    if (string.IsNullOrEmpty(oid)) 
        return Results.Unauthorized();
    
    // Find patient through auth identity link
    var authIdentity = await db.AuthIdentities
        .FirstOrDefaultAsync(a => a.Provider == "Microsoft" && a.ProviderSubject == oid && a.IsActive);
    
    if (authIdentity == null)
        return Results.NotFound(new { error = "Identity not found" });
    
    // Get patient data
    var patient = await db.Patients.FirstOrDefaultAsync(p => p.Id == authIdentity.PatientId);
    if (patient == null)
        return Results.NotFound(new { error = "Patient profile not found" });
    
    // Update last used timestamp
    authIdentity.LastUsedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();
    
    // Add audit log
    db.AuditLogs.Add(new AuditLog 
    { 
        PatientId = patient.Id, 
        Actor = oid, 
        Action = "profile_accessed", 
        Details = "{\"endpoint\":\"/api/patient\"}",
        Ip = http.Connection.RemoteIpAddress?.ToString(),
        UserAgent = http.Request.Headers["User-Agent"].FirstOrDefault(),
        CreatedAt = DateTime.UtcNow 
    });
    await db.SaveChangesAsync();
    
    return Results.Ok(new { 
        patientId = patient.Id,
        phone = patient.Phone,
        fullName = patient.FullName,
        email = patient.Email,
        dateOfBirth = patient.DateOfBirth,
        status = patient.Status,
        createdAt = patient.CreatedAt,
        updatedAt = patient.UpdatedAt
    });
}).RequireAuthorization();

// ============================================================================
// PHASE 1B: IDENTITY ARCHITECTURE API ENDPOINTS
// ============================================================================

// POST /auth/validate-upi - Validate UPI and return patient metadata
app.MapPost("/auth/validate-upi", async (HttpContext http, AppDbContext db) =>
{
    var body = await http.Request.ReadFromJsonAsync<Dictionary<string,string>>() ?? new();
    if (!body.TryGetValue("upi", out var upi) || string.IsNullOrWhiteSpace(upi))
        return Results.BadRequest(new { error = "upi required" });
    
    var patient = await db.Patients.FirstOrDefaultAsync(p => p.Upi == upi);
    if (patient == null)
        return Results.NotFound(new { error = "upi_not_found", message = "No patient found with this UPI" });
    
    // Check if user account exists for this patient
    var user = await db.Users.FirstOrDefaultAsync(u => u.PatientId == patient.Id);
    var hasCredentials = user != null && await db.Credentials.AnyAsync(c => c.UserId == user.UserId);
    
    return Results.Ok(new
    {
        upi = patient.Upi,
        patientId = patient.Id,
        status = patient.Status,
        hasUserAccount = user != null,
        hasCredentials = hasCredentials,
        metadata = new
        {
            fullName = patient.FullName,
            email = patient.Email,
            phone = patient.Phone
        }
    });
});

// POST /auth/exchange - Exchange Entra External ID token for internal session
app.MapPost("/auth/exchange", async (HttpContext http, AppDbContext db) =>
{
    var body = await http.Request.ReadFromJsonAsync<Dictionary<string,string>>() ?? new();
    
    // Get OID from Entra token (would come from validated JWT in production)
    var oid = http.User.FindFirst("oid")?.Value ?? http.User.FindFirst("sub")?.Value;
    if (string.IsNullOrEmpty(oid))
    {
        // For testing, allow oid from body
        if (!body.TryGetValue("oid", out oid) || string.IsNullOrWhiteSpace(oid))
            return Results.Unauthorized();
    }
    
    // Find user via external identity
    var externalIdentity = await db.ExternalIdentities
        .FirstOrDefaultAsync(ei => ei.Provider == "Microsoft" && ei.ProviderSub == oid);
    
    if (externalIdentity == null)
        return Results.NotFound(new { error = "identity_not_linked", message = "No user linked to this Entra ID" });
    
    var user = await db.Users.FirstOrDefaultAsync(u => u.UserId == externalIdentity.UserId);
    if (user == null)
        return Results.NotFound(new { error = "user_not_found" });
    
    // Check if locked
    if (user.IsLocked)
        return Results.StatusCode(423);
    
    // Update last login
    user.LastLogin = DateTime.UtcNow;
    await db.SaveChangesAsync();
    
    // Audit log
    db.AuditLogs.Add(new AuditLog
    {
        PatientId = user.PatientId ?? Guid.Empty,
        Actor = oid,
        Action = "token_exchange",
        Details = $"{{\"provider\":\"Microsoft\",\"userId\":\"{user.UserId}\"}}",
        Ip = http.Connection.RemoteIpAddress?.ToString(),
        UserAgent = http.Request.Headers["User-Agent"].FirstOrDefault(),
        CreatedAt = DateTime.UtcNow
    });
    await db.SaveChangesAsync();
    
    return Results.Ok(new
    {
        userId = user.UserId,
        patientId = user.PatientId,
        displayName = user.DisplayName,
        email = user.Email,
        mfaEnabled = user.MfaEnabled
    });
});

// POST /auth/upi-signin - UPI + Password authentication
app.MapPost("/auth/upi-signin", async (HttpContext http, AppDbContext db) =>
{
    var body = await http.Request.ReadFromJsonAsync<Dictionary<string,string>>() ?? new();
    if (!body.TryGetValue("upi", out var upi) || string.IsNullOrWhiteSpace(upi))
        return Results.BadRequest(new { error = "upi required" });
    if (!body.TryGetValue("password", out var password) || string.IsNullOrWhiteSpace(password))
        return Results.BadRequest(new { error = "password required" });
    
    // Find patient by UPI
    var patient = await db.Patients.FirstOrDefaultAsync(p => p.Upi == upi);
    if (patient == null)
        return Results.Unauthorized();
    
    // Find user account
    var user = await db.Users.FirstOrDefaultAsync(u => u.PatientId == patient.Id);
    if (user == null)
        return Results.Unauthorized();
    
    // Check if locked
    if (user.IsLocked)
        return Results.StatusCode(423);
    
    // Find password credential
    var credential = await db.Credentials
        .FirstOrDefaultAsync(c => c.UserId == user.UserId && c.CredentialType == "password");
    
    if (credential == null)
        return Results.Unauthorized();
    
    // Verify password
    var pepper = builder.Configuration["ARGON2_PEPPER"] ?? "";
    var isValid = await AuthService.Services.PasswordHelper.VerifyPasswordAsync(password, credential.PasswordHash ?? "", pepper);
    
    if (!isValid)
    {
        // Audit failed attempt
        db.AuditLogs.Add(new AuditLog
        {
            PatientId = patient.Id,
            Actor = upi,
            Action = "upi_signin_failed",
            Details = "{\"reason\":\"invalid_password\"}",
            Ip = http.Connection.RemoteIpAddress?.ToString(),
            UserAgent = http.Request.Headers["User-Agent"].FirstOrDefault(),
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();
        return Results.Unauthorized();
    }
    
    // Update last login
    user.LastLogin = DateTime.UtcNow;
    await db.SaveChangesAsync();
    
    // Audit successful login
    db.AuditLogs.Add(new AuditLog
    {
        PatientId = patient.Id,
        Actor = upi,
        Action = "upi_signin_success",
        Details = $"{{\"userId\":\"{user.UserId}\",\"mfaEnabled\":{user.MfaEnabled.ToString().ToLower()}}}",
        Ip = http.Connection.RemoteIpAddress?.ToString(),
        UserAgent = http.Request.Headers["User-Agent"].FirstOrDefault(),
        CreatedAt = DateTime.UtcNow
    });
    await db.SaveChangesAsync();
    
    return Results.Ok(new
    {
        patientId = patient.Id,
        userId = user.UserId,
        mfaRequired = user.MfaEnabled,
        displayName = user.DisplayName
    });
});

// POST /auth/verify-mfa - Verify MFA (uses DOB/PIN step-up authentication)
app.MapPost("/auth/verify-mfa", async (HttpContext http, AppDbContext db) =>
{
    var body = await http.Request.ReadFromJsonAsync<Dictionary<string,string>>() ?? new();
    
    if (!body.TryGetValue("patientId", out var patientIdStr) || !Guid.TryParse(patientIdStr, out var patientId))
        return Results.BadRequest(new { error = "patientId required" });
    
    if (!body.TryGetValue("code", out var code) || string.IsNullOrWhiteSpace(code))
        return Results.BadRequest(new { error = "code required" });
    
    var patient = await db.Patients.FirstOrDefaultAsync(p => p.Id == patientId);
    if (patient == null)
        return Results.NotFound(new { error = "patient_not_found" });
    
    var user = await db.Users.FirstOrDefaultAsync(u => u.PatientId == patientId);
    if (user == null || !user.MfaEnabled)
        return Results.BadRequest(new { error = "mfa_not_enabled" });
    
    // Check if locked
    if (user.IsLocked)
        return Results.StatusCode(423);
    
    // Find PIN credential
    var credential = await db.Credentials
        .FirstOrDefaultAsync(c => c.UserId == user.UserId && c.PinHash != null);
    
    if (credential == null)
        return Results.Unauthorized();
    
    // Verify PIN (4-digit code)
    var pepper = builder.Configuration["ARGON2_PEPPER"] ?? "";
    var isValid = await AuthService.Services.PasswordHelper.VerifyPasswordAsync(code, credential.PinHash ?? "", pepper);
    
    if (!isValid)
    {
        // Audit failed attempt
        db.AuditLogs.Add(new AuditLog
        {
            PatientId = patientId,
            Actor = user.UserId.ToString(),
            Action = "mfa_verification_failed",
            Details = "{\"reason\":\"invalid_code\"}",
            Ip = http.Connection.RemoteIpAddress?.ToString(),
            UserAgent = http.Request.Headers["User-Agent"].FirstOrDefault(),
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();
        return Results.Unauthorized();
    }
    
    // Update credential last used
    credential.LastUsedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();
    
    // Audit successful MFA
    db.AuditLogs.Add(new AuditLog
    {
        PatientId = patientId,
        Actor = user.UserId.ToString(),
        Action = "mfa_verification_success",
        Details = $"{{\"userId\":\"{user.UserId}\"}}",
        Ip = http.Connection.RemoteIpAddress?.ToString(),
        UserAgent = http.Request.Headers["User-Agent"].FirstOrDefault(),
        CreatedAt = DateTime.UtcNow
    });
    await db.SaveChangesAsync();
    
    return Results.Ok(new
    {
        success = true,
        patientId = patientId,
        userId = user.UserId
    });
});

// POST /empi/match - EMPI matching for duplicate detection
app.MapPost("/empi/match", async (HttpContext http, AppDbContext db) =>
{
    var body = await http.Request.ReadFromJsonAsync<Dictionary<string,object>>() ?? new();
    
    // Extract patient data for matching
    var firstName = body.ContainsKey("firstName") ? body["firstName"]?.ToString() : null;
    var lastName = body.ContainsKey("lastName") ? body["lastName"]?.ToString() : null;
    var dob = body.ContainsKey("dob") ? body["dob"]?.ToString() : null;
    var phone = body.ContainsKey("phone") ? body["phone"]?.ToString() : null;
    
    if (string.IsNullOrWhiteSpace(firstName) || string.IsNullOrWhiteSpace(lastName))
        return Results.BadRequest(new { error = "firstName and lastName required for matching" });
    
    // Simple matching logic (Phase 1C will implement full EMPI)
    var matches = new List<object>();
    var query = db.Patients.AsQueryable();
    
    // Name matching
    if (!string.IsNullOrWhiteSpace(lastName))
    {
        query = query.Where(p => EF.Functions.ILike(p.FullName ?? "", $"%{lastName}%"));
    }
    
    var candidates = await query.Take(10).ToListAsync();
    
    foreach (var candidate in candidates)
    {
        var score = 0.0;
        
        // Simple scoring
        if (candidate.FullName != null && candidate.FullName.Contains(lastName, StringComparison.OrdinalIgnoreCase))
            score += 50.0;
        if (candidate.FullName != null && candidate.FullName.Contains(firstName, StringComparison.OrdinalIgnoreCase))
            score += 30.0;
        if (candidate.Phone == phone)
            score += 20.0;
        
        if (score >= 50.0)
        {
            matches.Add(new
            {
                patientId = candidate.Id,
                upi = candidate.Upi,
                fullName = candidate.FullName,
                dob = candidate.DateOfBirth,
                phone = candidate.Phone,
                score = score
            });
        }
    }
    
    return Results.Ok(new
    {
        matches = matches.OrderByDescending(m => ((dynamic)m).score).ToList(),
        count = matches.Count
    });
});

// POST /auth/stepup/candidates - Get step-up authentication options
app.MapPost("/auth/stepup/candidates", async (HttpContext http, AppDbContext db) =>
{
    var body = await http.Request.ReadFromJsonAsync<Dictionary<string,string>>() ?? new();
    if (!body.TryGetValue("patientId", out var patientIdStr) || !Guid.TryParse(patientIdStr, out var patientId))
        return Results.BadRequest(new { error = "patientId required" });
    
    var patient = await db.Patients.FirstOrDefaultAsync(p => p.Id == patientId);
    if (patient == null)
        return Results.NotFound(new { error = "patient_not_found" });
    
    var methods = new List<object>();
    
    // Check if DOB is available
    if (patient.DateOfBirth != null)
    {
        methods.Add(new { method = "dob", label = "Date of Birth", available = true });
    }
    
    // Check if PIN is set
    var user = await db.Users.FirstOrDefaultAsync(u => u.PatientId == patientId);
    if (user != null)
    {
        var hasPin = await db.Credentials.AnyAsync(c => c.UserId == user.UserId && c.PinHash != null);
        if (hasPin)
        {
            methods.Add(new { method = "pin", label = "4-Digit PIN", available = true });
        }
    }
    
    return Results.Ok(new
    {
        patientId = patientId,
        methods = methods
    });
});

// POST /auth/stepup/verify - Verify step-up credentials (DOB + PIN)
app.MapPost("/auth/stepup/verify", async (HttpContext http, AppDbContext db) =>
{
    var body = await http.Request.ReadFromJsonAsync<Dictionary<string,string>>() ?? new();
    
    if (!body.TryGetValue("patientId", out var patientIdStr) || !Guid.TryParse(patientIdStr, out var patientId))
        return Results.BadRequest(new { error = "patientId required" });
    
    var patient = await db.Patients.FirstOrDefaultAsync(p => p.Id == patientId);
    if (patient == null)
        return Results.NotFound(new { error = "patient_not_found" });
    
    var verifiedMethods = new List<string>();
    var hasDob = body.TryGetValue("dob", out var dobStr);
    var hasPin = body.TryGetValue("pin", out var pinStr);
    
    // SECURITY: Require at least one verification method
    if (!hasDob && !hasPin)
    {
        return Results.BadRequest(new { 
            error = "verification_method_required",
            message = "At least one verification method (dob or pin) must be provided"
        });
    }
    
    // Verify DOB if provided
    if (hasDob)
    {
        if (patient.DateOfBirth == null)
            return Results.BadRequest(new { error = "dob_not_set" });
        
        if (!DateTime.TryParse(dobStr, out var providedDob))
            return Results.BadRequest(new { error = "invalid_dob_format" });
        
        var storedDob = patient.DateOfBirth.Value;
        var dobMatches = providedDob.Year == storedDob.Year &&
                        providedDob.Month == storedDob.Month &&
                        providedDob.Day == storedDob.Day;
        
        if (!dobMatches)
        {
            // Audit failed attempt
            db.AuditLogs.Add(new AuditLog
            {
                PatientId = patientId,
                Actor = "system",
                Action = "stepup_failed_dob",
                Details = "{\"reason\":\"dob_mismatch\"}",
                Ip = http.Connection.RemoteIpAddress?.ToString(),
                UserAgent = http.Request.Headers["User-Agent"].FirstOrDefault(),
                CreatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
            
            return Results.Unauthorized();
        }
        
        verifiedMethods.Add("dob");
    }
    
    // PIN verification (placeholder for Phase 1B - full implementation in Patient Portal)
    if (hasPin)
    {
        // Note: Full PIN verification is handled by Patient Portal API
        // This is a placeholder that always fails if PIN is provided here
        return Results.BadRequest(new { 
            error = "pin_verification_not_supported",
            message = "PIN verification should be done through Patient Portal API"
        });
    }
    
    // SECURITY: Ensure at least one method was successfully verified
    if (verifiedMethods.Count == 0)
    {
        return Results.Unauthorized();
    }
    
    // Audit successful verification with exact methods used
    var methodsJson = string.Join(",", verifiedMethods.Select(m => $"\"{m}\""));
    db.AuditLogs.Add(new AuditLog
    {
        PatientId = patientId,
        Actor = "system",
        Action = "stepup_verified",
        Details = $"{{\"methods\":[{methodsJson}]}}",
        Ip = http.Connection.RemoteIpAddress?.ToString(),
        UserAgent = http.Request.Headers["User-Agent"].FirstOrDefault(),
        CreatedAt = DateTime.UtcNow
    });
    await db.SaveChangesAsync();
    
    return Results.Ok(new
    {
        status = "verified",
        patientId = patientId,
        verifiedMethods = verifiedMethods
    });
});

// POST /staff/create_patient - Staff creates new patient with UPI
app.MapPost("/staff/create_patient", async (HttpContext http, AppDbContext db) =>
{
    var body = await http.Request.ReadFromJsonAsync<Dictionary<string,string>>() ?? new();
    
    // Basic validation
    if (!body.TryGetValue("phone", out var phone) || string.IsNullOrWhiteSpace(phone))
        return Results.BadRequest(new { error = "phone required" });
    
    if (!body.TryGetValue("fullName", out var fullName))
        fullName = null;
    
    if (!body.TryGetValue("email", out var email))
        email = null;
    
    // Generate UPI (simple implementation - Phase 1C will enhance)
    var upi = $"UPI-{Guid.NewGuid().ToString().Substring(0, 8).ToUpper()}";
    
    // Create patient
    var patient = new Patient
    {
        Upi = upi,
        Phone = phone,
        FullName = fullName,
        Email = email,
        Status = "active",
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };
    
    db.Patients.Add(patient);
    
    // Audit log
    var staffId = body.ContainsKey("staffId") ? body["staffId"] : "unknown";
    db.AuditLogs.Add(new AuditLog
    {
        PatientId = patient.Id,
        Actor = staffId,
        Action = "patient_created_by_staff",
        Details = $"{{\"upi\":\"{upi}\",\"phone\":\"{phone}\"}}",
        Ip = http.Connection.RemoteIpAddress?.ToString(),
        UserAgent = http.Request.Headers["User-Agent"].FirstOrDefault(),
        CreatedAt = DateTime.UtcNow
    });
    
    await db.SaveChangesAsync();
    
    return Results.Ok(new
    {
        status = "created",
        patientId = patient.Id,
        upi = upi
    });
});

// POST /staff/send_invite - Staff sends secure invite to patient
app.MapPost("/staff/send_invite", async (HttpContext http, AppDbContext db) =>
{
    var body = await http.Request.ReadFromJsonAsync<Dictionary<string,string>>() ?? new();
    
    if (!body.TryGetValue("patientId", out var patientIdStr) || !Guid.TryParse(patientIdStr, out var patientId))
        return Results.BadRequest(new { error = "patientId required" });
    
    if (!body.TryGetValue("deliveryChannel", out var channel) || string.IsNullOrWhiteSpace(channel))
        return Results.BadRequest(new { error = "deliveryChannel required (sms or email)" });
    
    var patient = await db.Patients.FirstOrDefaultAsync(p => p.Id == patientId);
    if (patient == null)
        return Results.NotFound(new { error = "patient_not_found" });
    
    // Generate secure invite token
    var inviteToken = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32));
    var tokenHash = System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(inviteToken));
    var tokenHashStr = Convert.ToBase64String(tokenHash);
    
    // Note: staff_invites table insert would go here in Phase 1C
    // For now, we'll use the link_token table as a proxy
    var linkSecret = builder.Configuration["LINK_TOKEN_HMAC_SECRET"] ?? otpSecret;
    var linkToken = await AuthService.Services.LinkTokenHelper.CreateAndStoreLinkTokenAsync(
        db, patientId, linkSecret ?? "", TimeSpan.FromDays(7));
    
    // Audit log
    var staffId = body.ContainsKey("staffId") ? body["staffId"] : "unknown";
    db.AuditLogs.Add(new AuditLog
    {
        PatientId = patientId,
        Actor = staffId,
        Action = "invite_sent",
        Details = $"{{\"channel\":\"{channel}\"}}",
        Ip = http.Connection.RemoteIpAddress?.ToString(),
        UserAgent = http.Request.Headers["User-Agent"].FirstOrDefault(),
        CreatedAt = DateTime.UtcNow
    });
    await db.SaveChangesAsync();
    
    return Results.Ok(new
    {
        status = "invite_sent",
        patientId = patientId,
        inviteToken = linkToken,
        channel = channel,
        expiresIn = 604800 // 7 days in seconds
    });
});

app.Run();