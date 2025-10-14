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
using Microsoft.IdentityModel.Tokens;
using System.Text;

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

// Register JWT Service
builder.Services.AddSingleton<JwtService>();

// Configure JWT Authentication
var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET");
if (!string.IsNullOrEmpty(jwtSecret))
{
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(
                    System.Text.Encoding.UTF8.GetBytes(jwtSecret)),
                ValidateIssuer = true,
                ValidIssuer = builder.Configuration["Jwt:Issuer"],
                ValidateAudience = true,
                ValidAudience = builder.Configuration["Jwt:Audience"],
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            };
        });
    builder.Services.AddAuthorization();
    Console.WriteLine("JWT Authentication configured successfully");
}
else
{
    Console.WriteLine("WARNING: JWT_SECRET not set - authentication disabled");
}

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

// Enable JWT Authentication and Authorization
app.UseAuthentication();
app.UseAuthorization();

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
    bool isNewUser = false;
    
    if (accounts.Count == 0)
    {
        // Generate UPI for new patient
        var upi = $"UPI{Guid.NewGuid().ToString("N").Substring(0, 6).ToUpper()}";
        var newPatient = new Patient { 
            Phone = phone, 
            Upi = upi,
            CreatedAt = DateTime.UtcNow, 
            UpdatedAt = DateTime.UtcNow 
        };
        db.Patients.Add(newPatient);
        await db.SaveChangesAsync();
        primaryPatientId = newPatient.Id;
        isNewUser = true; // Flag this as a brand new user
        
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
        
        // If the user has accounts but ALL of them have incomplete profiles, treat as new user
        // This ensures they go through the complete signup flow (password, MFA, consent)
        var allAccountsIncomplete = accounts.All(a => {
            var hasProfile = a.GetType().GetProperty("hasProfile")?.GetValue(a);
            return hasProfile is bool b && !b;
        });
        
        if (allAccountsIncomplete && accounts.Count == 1)
        {
            isNewUser = true; // Force complete signup flow for users with incomplete profiles
        }
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
        linkToken = linkToken,
        isNewUser = isNewUser // Flag to indicate brand new user vs existing user
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

// POST /auth/signin/upi - UPI + Password authentication with JWT response
app.MapPost("/auth/signin/upi", async (HttpContext http, AppDbContext db, JwtService jwtService) =>
{
    var body = await http.Request.ReadFromJsonAsync<Dictionary<string,string>>() ?? new();
    if (!body.TryGetValue("upi", out var upi) || string.IsNullOrWhiteSpace(upi))
        return Results.BadRequest(new { error = "upi required" });
    if (!body.TryGetValue("password", out var password) || string.IsNullOrWhiteSpace(password))
        return Results.BadRequest(new { error = "password required" });
    
    // Find patient by UPI
    var patient = await db.Patients.FirstOrDefaultAsync(p => p.Upi == upi);
    if (patient == null)
        return Results.Json(new { error = "invalid_credentials" }, statusCode: 401);
    
    // Find user account
    var user = await db.Users.FirstOrDefaultAsync(u => u.PatientId == patient.Id);
    if (user == null)
        return Results.Json(new { error = "incomplete_signup", message = "Please complete your account setup" }, statusCode: 401);
    
    // Check if locked
    if (user.IsLocked)
        return Results.StatusCode(423);
    
    // Find password credential
    var credential = await db.Credentials
        .FirstOrDefaultAsync(c => c.UserId == user.UserId && c.CredentialType == "password");
    
    if (credential == null)
        return Results.Json(new { error = "incomplete_signup", message = "Please complete your account setup" }, statusCode: 401);
    
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
        return Results.Json(new { error = "invalid_credentials", message = "Invalid UPI or password" }, statusCode: 401);
    }
    
    // Check if MFA credential actually exists (TOTP or PIN)
    var mfaCredential = await db.Credentials
        .FirstOrDefaultAsync(c => c.UserId == user.UserId && 
            (c.CredentialType == "totp" || c.PinHash != null));
    
    // Only require MFA if user has mfaEnabled AND a credential exists
    bool requireMfa = user.MfaEnabled && mfaCredential != null;
    
    // If MFA required, return mfaRequired flag with session info
    if (requireMfa)
    {
        // Audit successful password verification (MFA pending)
        db.AuditLogs.Add(new AuditLog
        {
            PatientId = patient.Id,
            Actor = upi,
            Action = "upi_signin_mfa_pending",
            Details = $"{{\"userId\":\"{user.UserId}\",\"mfaRequired\":true}}",
            Ip = http.Connection.RemoteIpAddress?.ToString(),
            UserAgent = http.Request.Headers["User-Agent"].FirstOrDefault(),
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();
        
        return Results.Ok(new
        {
            status = "mfa_required",
            patientId = patient.Id,
            userId = user.UserId,
            displayName = user.DisplayName
        });
    }
    
    // Update last login
    user.LastLogin = DateTime.UtcNow;
    await db.SaveChangesAsync();
    
    // Generate JWT tokens
    var accessToken = jwtService.GenerateAccessToken(
        user.UserId.ToString(),
        upi,
        patient.Email ?? user.Email
    );
    var refreshToken = jwtService.GenerateRefreshToken();
    
    // Store refresh token hash
    var refreshTokenHash = Convert.ToHexString(
        System.Security.Cryptography.SHA256.HashData(
            System.Text.Encoding.UTF8.GetBytes(refreshToken)));
    
    var linkToken = new LinkToken
    {
        PatientId = patient.Id,
        TokenHash = refreshTokenHash,
        ExpiresAt = DateTime.UtcNow.AddDays(7),
        CreatedAt = DateTime.UtcNow
    };
    
    db.LinkTokens.Add(linkToken);
    
    // Audit successful login
    db.AuditLogs.Add(new AuditLog
    {
        PatientId = patient.Id,
        Actor = upi,
        Action = "upi_signin_success",
        Details = $"{{\"userId\":\"{user.UserId}\",\"mfaEnabled\":false}}",
        Ip = http.Connection.RemoteIpAddress?.ToString(),
        UserAgent = http.Request.Headers["User-Agent"].FirstOrDefault(),
        CreatedAt = DateTime.UtcNow
    });
    await db.SaveChangesAsync();
    
    return Results.Ok(new
    {
        status = "authenticated",
        user = new
        {
            id = user.UserId,
            upi = patient.Upi,
            name = patient.FirstName + " " + patient.LastName,
            email = patient.Email ?? user.Email
        },
        accessToken,
        refreshToken
    });
});

// POST /auth/verify-mfa - Verify MFA and return JWT tokens
app.MapPost("/auth/verify-mfa", async (HttpContext http, AppDbContext db, JwtService jwtService) =>
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
    
    // Update credential last used and user last login
    credential.LastUsedAt = DateTime.UtcNow;
    user.LastLogin = DateTime.UtcNow;
    await db.SaveChangesAsync();
    
    // Generate JWT tokens
    var accessToken = jwtService.GenerateAccessToken(
        user.UserId.ToString(),
        patient.Upi ?? "",
        patient.Email ?? user.Email
    );
    var refreshToken = jwtService.GenerateRefreshToken();
    
    // Store refresh token hash
    var refreshTokenHash = Convert.ToHexString(
        System.Security.Cryptography.SHA256.HashData(
            System.Text.Encoding.UTF8.GetBytes(refreshToken)));
    
    var linkToken = new LinkToken
    {
        PatientId = patient.Id,
        TokenHash = refreshTokenHash,
        ExpiresAt = DateTime.UtcNow.AddDays(7),
        CreatedAt = DateTime.UtcNow
    };
    
    db.LinkTokens.Add(linkToken);
    
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
        status = "authenticated",
        user = new
        {
            id = user.UserId,
            upi = patient.Upi,
            name = patient.FirstName + " " + patient.LastName,
            email = patient.Email ?? user.Email
        },
        accessToken,
        refreshToken
    });
});

// POST /auth/signin/phone/request-otp - Request OTP for phone sign-in
app.MapPost("/auth/signin/phone/request-otp", async (HttpContext http, AppDbContext db) =>
{
    var payload = await http.Request.ReadFromJsonAsync<Dictionary<string,string>>() ?? new();
    if (!payload.TryGetValue("phone", out var phone)) 
        return Results.BadRequest(new { error = "phone required" });
    
    var ip = http.Connection.RemoteIpAddress?.ToString() ?? http.Request.Headers["x-forwarded-for"].FirstOrDefault() ?? "unknown";
    
    // Rate limiting
    if (rateLimiter != null)
    {
        var ipCount = await rateLimiter.IncrementAsync($"rl:ip:{ip}", 60);
        if (ipCount > 60) return Results.StatusCode(429);
        var pcount = await rateLimiter.IncrementAsync($"rl:phone:{phone}", 15*60);
        if (pcount > 3) return Results.StatusCode(429);
    }
    
    // Check if patient exists with this phone
    var patient = await db.Patients.FirstOrDefaultAsync(p => p.Phone == phone);
    if (patient == null)
        return Results.NotFound(new { error = "no_account_found", message = "No account found with this phone number" });
    
    var otp = AuthService.Services.OtpHelper.GenerateOtp();
    var nonce = AuthService.Services.OtpHelper.NewNonce();
    var hash = AuthService.Services.OtpHelper.ComputeHmac(otpSecret ?? "", otp, nonce);
    var expiresAt = DateTime.UtcNow.AddMinutes(5);
    
    var entry = new OtpAttempt {
        Phone = phone, 
        OtpHash = hash, 
        Nonce = nonce, 
        ExpiresAt = expiresAt,
        Attempts = 0, 
        ResendCount = 1, 
        Status = "pending", 
        CreatedAt = DateTime.UtcNow
    };
    db.OtpAttempts.Add(entry);
    await db.SaveChangesAsync();
    
    try {
        if (!string.IsNullOrEmpty(twilioSid) && !string.IsNullOrEmpty(twilioToken) && !string.IsNullOrEmpty(twilioFrom)) {
            await MessageResource.CreateAsync(
                body: $"Your verification code is {otp}", 
                from: new PhoneNumber(twilioFrom), 
                to: new PhoneNumber(phone)
            );
        }
    } catch (Exception ex) { 
        Console.WriteLine($"Twilio error: {ex.Message}"); 
        return Results.StatusCode(500); 
    }
    
    return Results.Ok(new { status = "otp_sent", expiresIn = 300 });
});

// POST /auth/signin/phone/verify-otp - Verify OTP and return JWT tokens
app.MapPost("/auth/signin/phone/verify-otp", async (HttpContext http, AppDbContext db, JwtService jwtService) =>
{
    var p = await http.Request.ReadFromJsonAsync<Dictionary<string,string>>() ?? new();
    if (!p.TryGetValue("phone", out var phone) || !p.TryGetValue("otp", out var otp)) 
        return Results.BadRequest(new { error = "phone and otp required" });
    
    var entry = await db.OtpAttempts
        .Where(x => x.Phone == phone && x.Status == "pending")
        .OrderByDescending(x => x.CreatedAt)
        .FirstOrDefaultAsync();
        
    if (entry == null) 
        return Results.BadRequest(new { error = "no_otp_found" });
    if (DateTime.UtcNow > entry.ExpiresAt) { 
        entry.Status = "expired"; 
        await db.SaveChangesAsync(); 
        return Results.BadRequest(new { error = "otp_expired" }); 
    }
    if (entry.Attempts >= 3) { 
        entry.Status = "failed"; 
        await db.SaveChangesAsync(); 
        return Results.BadRequest(new { error = "max_attempts_exceeded", message = "Too many incorrect attempts. Please request a new OTP." }); 
    }
    
    var expected = AuthService.Services.OtpHelper.ComputeHmac(otpSecret ?? "", otp, entry.Nonce ?? "");
    if (!string.Equals(expected, entry.OtpHash, StringComparison.OrdinalIgnoreCase)) { 
        entry.Attempts++; 
        await db.SaveChangesAsync(); 
        return Results.BadRequest(new { error = "invalid_otp", attemptsLeft = 3 - entry.Attempts }); 
    }
    
    entry.Status = "verified";
    await db.SaveChangesAsync();
    
    // Find patient with this phone
    var patient = await db.Patients.FirstOrDefaultAsync(p => p.Phone == phone);
    if (patient == null)
        return Results.NotFound(new { error = "patient_not_found" });
    
    var user = await db.Users.FirstOrDefaultAsync(u => u.PatientId == patient.Id);
    if (user == null)
        return Results.NotFound(new { error = "user_not_found" });
    
    // Update last login
    user.LastLogin = DateTime.UtcNow;
    await db.SaveChangesAsync();
    
    // Generate JWT tokens
    var accessToken = jwtService.GenerateAccessToken(
        user.UserId.ToString(),
        patient.Upi ?? "",
        patient.Email ?? user.Email
    );
    var refreshToken = jwtService.GenerateRefreshToken();
    
    // Store refresh token hash
    var refreshTokenHash = Convert.ToHexString(
        System.Security.Cryptography.SHA256.HashData(
            System.Text.Encoding.UTF8.GetBytes(refreshToken)));
    
    var linkToken = new LinkToken
    {
        PatientId = patient.Id,
        TokenHash = refreshTokenHash,
        ExpiresAt = DateTime.UtcNow.AddDays(7),
        CreatedAt = DateTime.UtcNow
    };
    
    db.LinkTokens.Add(linkToken);
    
    // Audit log
    db.AuditLogs.Add(new AuditLog
    {
        PatientId = patient.Id,
        Actor = phone,
        Action = "phone_signin_success",
        Details = $"{{\"userId\":\"{user.UserId}\"}}",
        Ip = http.Connection.RemoteIpAddress?.ToString(),
        UserAgent = http.Request.Headers["User-Agent"].FirstOrDefault(),
        CreatedAt = DateTime.UtcNow
    });
    await db.SaveChangesAsync();
    
    return Results.Ok(new
    {
        status = "authenticated",
        user = new
        {
            id = user.UserId,
            upi = patient.Upi,
            name = patient.FirstName + " " + patient.LastName,
            email = patient.Email ?? user.Email
        },
        accessToken,
        refreshToken
    });
});

// POST /auth/signin/email/request-otp - Request OTP for email sign-in
app.MapPost("/auth/signin/email/request-otp", async (HttpContext http, AppDbContext db) =>
{
    var payload = await http.Request.ReadFromJsonAsync<Dictionary<string,string>>() ?? new();
    if (!payload.TryGetValue("email", out var email)) 
        return Results.BadRequest(new { error = "email required" });
    
    // Check if patient exists with this email
    var patient = await db.Patients.FirstOrDefaultAsync(p => p.Email == email);
    if (patient == null)
        return Results.NotFound(new { error = "no_account_found", message = "No account found with this email address" });
    
    var otp = AuthService.Services.OtpHelper.GenerateOtp();
    var nonce = AuthService.Services.OtpHelper.NewNonce();
    var hash = AuthService.Services.OtpHelper.ComputeHmac(otpSecret ?? "", otp, nonce);
    var expiresAt = DateTime.UtcNow.AddMinutes(5);
    
    var entry = new OtpAttempt {
        Email = email,
        OtpHash = hash, 
        Nonce = nonce, 
        ExpiresAt = expiresAt,
        Attempts = 0, 
        ResendCount = 1, 
        Status = "pending", 
        CreatedAt = DateTime.UtcNow
    };
    db.OtpAttempts.Add(entry);
    await db.SaveChangesAsync();
    
    // TODO: Send email via SendGrid/SMTP
    // For now, just return success
    Console.WriteLine($"Email OTP for {email}: {otp}");
    
    return Results.Ok(new { status = "otp_sent", expiresIn = 300, debug_otp = otp });
});

// POST /auth/signin/email/verify-otp - Verify email OTP and return JWT tokens
app.MapPost("/auth/signin/email/verify-otp", async (HttpContext http, AppDbContext db, JwtService jwtService) =>
{
    var p = await http.Request.ReadFromJsonAsync<Dictionary<string,string>>() ?? new();
    if (!p.TryGetValue("email", out var email) || !p.TryGetValue("otp", out var otp)) 
        return Results.BadRequest(new { error = "email and otp required" });
    
    var entry = await db.OtpAttempts
        .Where(x => x.Email == email && x.Status == "pending")
        .OrderByDescending(x => x.CreatedAt)
        .FirstOrDefaultAsync();
        
    if (entry == null) 
        return Results.BadRequest(new { error = "no_otp_found" });
    if (DateTime.UtcNow > entry.ExpiresAt) { 
        entry.Status = "expired"; 
        await db.SaveChangesAsync(); 
        return Results.BadRequest(new { error = "otp_expired" }); 
    }
    if (entry.Attempts >= 3) { 
        entry.Status = "failed"; 
        await db.SaveChangesAsync(); 
        return Results.BadRequest(new { error = "max_attempts_exceeded" }); 
    }
    
    var expected = AuthService.Services.OtpHelper.ComputeHmac(otpSecret ?? "", otp, entry.Nonce ?? "");
    if (!string.Equals(expected, entry.OtpHash, StringComparison.OrdinalIgnoreCase)) { 
        entry.Attempts++; 
        await db.SaveChangesAsync(); 
        return Results.BadRequest(new { error = "invalid_otp", attemptsLeft = 3 - entry.Attempts }); 
    }
    
    entry.Status = "verified";
    await db.SaveChangesAsync();
    
    // Find patient with this email
    var patient = await db.Patients.FirstOrDefaultAsync(p => p.Email == email);
    if (patient == null)
        return Results.NotFound(new { error = "patient_not_found" });
    
    var user = await db.Users.FirstOrDefaultAsync(u => u.PatientId == patient.Id);
    if (user == null)
        return Results.NotFound(new { error = "user_not_found" });
    
    // Update last login
    user.LastLogin = DateTime.UtcNow;
    await db.SaveChangesAsync();
    
    // Generate JWT tokens
    var accessToken = jwtService.GenerateAccessToken(
        user.UserId.ToString(),
        patient.Upi ?? "",
        patient.Email ?? user.Email
    );
    var refreshToken = jwtService.GenerateRefreshToken();
    
    // Store refresh token hash
    var refreshTokenHash = Convert.ToHexString(
        System.Security.Cryptography.SHA256.HashData(
            System.Text.Encoding.UTF8.GetBytes(refreshToken)));
    
    var linkToken = new LinkToken
    {
        PatientId = patient.Id,
        TokenHash = refreshTokenHash,
        ExpiresAt = DateTime.UtcNow.AddDays(7),
        CreatedAt = DateTime.UtcNow
    };
    
    db.LinkTokens.Add(linkToken);
    
    // Audit log
    db.AuditLogs.Add(new AuditLog
    {
        PatientId = patient.Id,
        Actor = email,
        Action = "email_signin_success",
        Details = $"{{\"userId\":\"{user.UserId}\"}}",
        Ip = http.Connection.RemoteIpAddress?.ToString(),
        UserAgent = http.Request.Headers["User-Agent"].FirstOrDefault(),
        CreatedAt = DateTime.UtcNow
    });
    await db.SaveChangesAsync();
    
    return Results.Ok(new
    {
        status = "authenticated",
        user = new
        {
            id = user.UserId,
            upi = patient.Upi,
            name = patient.FirstName + " " + patient.LastName,
            email = patient.Email ?? user.Email
        },
        accessToken,
        refreshToken
    });
});

// POST /auth/token/refresh - Refresh access token using refresh token
app.MapPost("/auth/token/refresh", async (HttpContext http, AppDbContext db, JwtService jwtService) =>
{
    var body = await http.Request.ReadFromJsonAsync<Dictionary<string,string>>() ?? new();
    if (!body.TryGetValue("refreshToken", out var refreshToken) || string.IsNullOrWhiteSpace(refreshToken))
        return Results.BadRequest(new { error = "refreshToken required" });
    
    // Hash the refresh token to find in database
    var refreshTokenHash = Convert.ToHexString(
        System.Security.Cryptography.SHA256.HashData(
            System.Text.Encoding.UTF8.GetBytes(refreshToken)));
    
    // Find the link token
    var linkToken = await db.LinkTokens
        .FirstOrDefaultAsync(lt => lt.TokenHash == refreshTokenHash && lt.ExpiresAt > DateTime.UtcNow);
    
    if (linkToken == null)
        return Results.Json(new { error = "invalid_token", message = "Refresh token is invalid or expired" }, statusCode: 401);
    
    // Get patient and user
    var patient = await db.Patients.FirstOrDefaultAsync(p => p.Id == linkToken.PatientId);
    if (patient == null)
        return Results.NotFound(new { error = "patient_not_found" });
    
    var user = await db.Users.FirstOrDefaultAsync(u => u.PatientId == patient.Id);
    if (user == null)
        return Results.NotFound(new { error = "user_not_found" });
    
    // Check if user is locked
    if (user.IsLocked)
        return Results.StatusCode(423);
    
    // Generate new access token (refresh token stays the same)
    var newAccessToken = jwtService.GenerateAccessToken(
        user.UserId.ToString(),
        patient.Upi ?? "",
        patient.Email ?? user.Email
    );
    
    // Audit log
    db.AuditLogs.Add(new AuditLog
    {
        PatientId = patient.Id,
        Actor = user.UserId.ToString(),
        Action = "token_refresh",
        Details = $"{{\"userId\":\"{user.UserId}\"}}",
        Ip = http.Connection.RemoteIpAddress?.ToString(),
        UserAgent = http.Request.Headers["User-Agent"].FirstOrDefault(),
        CreatedAt = DateTime.UtcNow
    });
    await db.SaveChangesAsync();
    
    return Results.Ok(new
    {
        accessToken = newAccessToken,
        refreshToken = refreshToken
    });
});

// POST /empi/match - CDC-compliant EMPI matching with weighted probabilistic scoring
app.MapPost("/empi/match", async (HttpContext http, AppDbContext db) =>
{
    var body = await http.Request.ReadFromJsonAsync<Dictionary<string,object>>() ?? new();
    
    // Extract patient data for matching
    var firstName = body.ContainsKey("firstName") ? body["firstName"]?.ToString() : null;
    var middleName = body.ContainsKey("middleName") ? body["middleName"]?.ToString() : null;
    var lastName = body.ContainsKey("lastName") ? body["lastName"]?.ToString() : null;
    var dob = body.ContainsKey("dob") ? body["dob"]?.ToString() : null;
    var gender = body.ContainsKey("gender") ? body["gender"]?.ToString() : null;
    var phone = body.ContainsKey("phone") ? body["phone"]?.ToString() : null;
    var email = body.ContainsKey("email") ? body["email"]?.ToString() : null;
    var govtIdType = body.ContainsKey("govtIdType") ? body["govtIdType"]?.ToString() : null;
    var govtIdNumber = body.ContainsKey("govtIdNumber") ? body["govtIdNumber"]?.ToString() : null;
    
    if (string.IsNullOrWhiteSpace(firstName) || string.IsNullOrWhiteSpace(lastName))
        return Results.BadRequest(new { error = "firstName and lastName required for matching" });
    
    // STEP 1: Government ID Instant Match (100 points = guaranteed duplicate)
    if (!string.IsNullOrWhiteSpace(govtIdType) && !string.IsNullOrWhiteSpace(govtIdNumber))
    {
        var govtIdMatch = await db.Patients
            .Where(p => p.GovtIdType == govtIdType && p.GovtIdNumber == govtIdNumber)
            .FirstOrDefaultAsync();
            
        if (govtIdMatch != null)
        {
            // Government ID match = 100% duplicate (instant block)
            return Results.Ok(new
            {
                matches = new[] {
                    new {
                        patientId = govtIdMatch.Id,
                        upi = govtIdMatch.Upi,
                        firstName = govtIdMatch.FirstName,
                        middleName = govtIdMatch.MiddleName,
                        lastName = govtIdMatch.LastName,
                        dob = govtIdMatch.DateOfBirth,
                        gender = govtIdMatch.Gender,
                        phone = govtIdMatch.Phone,
                        email = govtIdMatch.Email,
                        score = 100.0,
                        matchReason = "Government ID exact match",
                        decision = "block"
                    }
                },
                count = 1,
                highestScore = 100.0,
                decision = "block"
            });
        }
    }
    
    // STEP 2: Demographic Weighted Scoring
    // Get broad candidate pool using last name fuzzy matching
    var query = db.Patients.AsQueryable();
    
    // Use trigram similarity for name matching (fuzzy)
    if (!string.IsNullOrWhiteSpace(lastName))
    {
        query = query.Where(p => EF.Functions.ILike(p.LastName ?? "", $"%{lastName}%") || 
                                EF.Functions.ILike(p.FullName ?? "", $"%{lastName}%"));
    }
    
    var candidates = await query.Take(50).ToListAsync();
    
    var matches = new List<object>();
    
    foreach (var candidate in candidates)
    {
        var score = 0.0;
        var reasons = new List<string>();
        
        // WEIGHTED SCORING ALGORITHM
        // Government ID: 100 points (already checked above)
        // First Name: 25 points
        // Last Name: 25 points  
        // DOB: 30 points
        // Gender: 10 points
        // Phone: 7 points (not blocking alone)
        // Email: 5 points (not blocking alone)
        // Address: 3 points (future implementation)
        
        // First Name matching (25 points max)
        if (!string.IsNullOrWhiteSpace(candidate.FirstName) && !string.IsNullOrWhiteSpace(firstName))
        {
            if (candidate.FirstName.Equals(firstName, StringComparison.OrdinalIgnoreCase))
            {
                score += 25.0;
                reasons.Add("First name exact match");
            }
            else if (candidate.FirstName.Contains(firstName, StringComparison.OrdinalIgnoreCase) || 
                     firstName.Contains(candidate.FirstName, StringComparison.OrdinalIgnoreCase))
            {
                score += 15.0;
                reasons.Add("First name partial match");
            }
        }
        
        // Last Name matching (25 points max)
        if (!string.IsNullOrWhiteSpace(candidate.LastName) && !string.IsNullOrWhiteSpace(lastName))
        {
            if (candidate.LastName.Equals(lastName, StringComparison.OrdinalIgnoreCase))
            {
                score += 25.0;
                reasons.Add("Last name exact match");
            }
            else if (candidate.LastName.Contains(lastName, StringComparison.OrdinalIgnoreCase) || 
                     lastName.Contains(candidate.LastName, StringComparison.OrdinalIgnoreCase))
            {
                score += 15.0;
                reasons.Add("Last name partial match");
            }
        }
        
        // Date of Birth matching (30 points)
        if (candidate.DateOfBirth != null && !string.IsNullOrWhiteSpace(dob))
        {
            if (DateTime.TryParse(dob, out var dobDate))
            {
                if (candidate.DateOfBirth.Value.Date == dobDate.Date)
                {
                    score += 30.0;
                    reasons.Add("DOB exact match");
                }
            }
        }
        
        // Gender matching (10 points)
        if (!string.IsNullOrWhiteSpace(candidate.Gender) && !string.IsNullOrWhiteSpace(gender))
        {
            if (candidate.Gender.Equals(gender, StringComparison.OrdinalIgnoreCase))
            {
                score += 10.0;
                reasons.Add("Gender match");
            }
        }
        
        // Phone matching (7 points - supporting evidence, not blocking)
        if (!string.IsNullOrWhiteSpace(candidate.Phone) && !string.IsNullOrWhiteSpace(phone))
        {
            if (candidate.Phone == phone)
            {
                score += 7.0;
                reasons.Add("Phone match");
            }
        }
        
        // Email matching (5 points - supporting evidence, not blocking)
        if (!string.IsNullOrWhiteSpace(candidate.Email) && !string.IsNullOrWhiteSpace(email))
        {
            if (candidate.Email.Equals(email, StringComparison.OrdinalIgnoreCase))
            {
                score += 5.0;
                reasons.Add("Email match");
            }
        }
        
        // Only include candidates with score >= 50 (potential matches)
        if (score >= 50.0)
        {
            // Decision logic based on score
            string decision;
            if (score >= 80.0)
                decision = "block"; // High probability duplicate - hard block
            else if (score >= 50.0)
                decision = "review"; // Medium probability - flag for manual review
            else
                decision = "allow"; // Low probability - allow registration
            
            matches.Add(new
            {
                patientId = candidate.Id,
                upi = candidate.Upi,
                firstName = candidate.FirstName,
                middleName = candidate.MiddleName,
                lastName = candidate.LastName,
                dob = candidate.DateOfBirth,
                gender = candidate.Gender,
                phone = candidate.Phone,
                email = candidate.Email,
                score = score,
                matchReason = string.Join(", ", reasons),
                decision = decision
            });
        }
    }
    
    // Sort by score descending
    var sortedMatches = matches.OrderByDescending(m => ((dynamic)m).score).ToList();
    var highestScore = sortedMatches.Any() ? ((dynamic)sortedMatches[0]).score : 0.0;
    
    // Overall decision based on highest match score
    string overallDecision;
    if (highestScore >= 80.0)
        overallDecision = "block";
    else if (highestScore >= 50.0)
        overallDecision = "review";
    else
        overallDecision = "allow";
    
    // HIPAA Audit Logging - Log all EMPI decisions (REQUIRED for compliance)
    var topMatch = sortedMatches.Count > 0 ? sortedMatches[0] as dynamic : null;
    db.AuditLogs.Add(new AuditLog
    {
        PatientId = topMatch != null ? (Guid)topMatch.patientId : Guid.Empty,
        Actor = "system",
        Action = "empi_match",
        Details = $@"{{
            ""decision"":""{overallDecision}"",
            ""highestScore"":{highestScore},
            ""matchCount"":{sortedMatches.Count},
            ""searchCriteria"":{{
                ""firstName"":""{firstName}"",
                ""lastName"":""{lastName}"",
                ""dob"":""{dob}"",
                ""gender"":""{gender}"",
                ""phone"":""{phone}"",
                ""email"":""{email}"",
                ""govtIdType"":""{govtIdType}"",
                ""govtIdNumber"":""{(string.IsNullOrEmpty(govtIdNumber) ? "" : "***REDACTED***")}""
            }},
            ""topMatchReason"":""{(topMatch != null ? topMatch.matchReason : "")}""
        }}",
        Ip = http.Connection.RemoteIpAddress?.ToString(),
        UserAgent = http.Request.Headers["User-Agent"].FirstOrDefault(),
        CreatedAt = DateTime.UtcNow
    });
    await db.SaveChangesAsync();
    
    return Results.Ok(new
    {
        matches = sortedMatches,
        count = sortedMatches.Count,
        highestScore = highestScore,
        decision = overallDecision
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

// POST /auth/register - New patient registration with EMPI check and JWT generation
app.MapPost("/auth/register", async (HttpContext http, AppDbContext db, JwtService jwtService) =>
{
    var body = await http.Request.ReadFromJsonAsync<Dictionary<string,object>>() ?? new();
    
    // Extract patient data
    if (!body.TryGetValue("profileData", out var profileDataObj))
        return Results.BadRequest(new { error = "profileData required" });
    
    var profileData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string,object>>(
        profileDataObj.ToString() ?? "{}"
    ) ?? new();
    
    if (!body.TryGetValue("password", out var passwordObj) || string.IsNullOrWhiteSpace(passwordObj?.ToString()))
        return Results.BadRequest(new { error = "password required" });
    
    var password = passwordObj.ToString()!;
    
    // Extract required fields
    var firstName = profileData.ContainsKey("firstName") ? profileData["firstName"]?.ToString() : null;
    var lastName = profileData.ContainsKey("lastName") ? profileData["lastName"]?.ToString() : null;
    var dob = profileData.ContainsKey("dob") ? profileData["dob"]?.ToString() : null;
    var phone = profileData.ContainsKey("phone") ? profileData["phone"]?.ToString() : null;
    
    if (string.IsNullOrWhiteSpace(firstName) || string.IsNullOrWhiteSpace(lastName))
        return Results.BadRequest(new { error = "firstName and lastName required" });
    
    // EMPI Check - call existing /empi/match endpoint internally
    var empiRequest = new
    {
        firstName,
        lastName,
        dob,
        phone,
        email = profileData.ContainsKey("email") ? profileData["email"]?.ToString() : null,
        govtIdType = profileData.ContainsKey("govtIdType") ? profileData["govtIdType"]?.ToString() : null,
        govtIdNumber = profileData.ContainsKey("govtIdNumber") ? profileData["govtIdNumber"]?.ToString() : null
    };
    
    var empiResponse = await PerformEmpiCheckAsync(db, empiRequest);
    
    // Block if duplicate score >= 80
    if (empiResponse.score >= 80)
    {
        // Log audit for duplicate attempt (no PHI in response)
        db.AuditLogs.Add(new AuditLog
        {
            PatientId = null,
            Actor = "system",
            Action = "registration_blocked_duplicate",
            Details = $"{{\"empiScore\":{empiResponse.score}}}",
            Ip = http.Connection.RemoteIpAddress?.ToString(),
            UserAgent = http.Request.Headers["User-Agent"].FirstOrDefault(),
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();
        
        return Results.Conflict(new { 
            error = "duplicate_detected",
            message = "A patient with similar information already exists. Please contact support."
        });
    }
    
    // Generate UPI
    var upi = $"UPI-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}";
    
    // Create patient record
    var patient = new Patient
    {
        Id = Guid.NewGuid(),
        Upi = upi,
        FirstName = firstName,
        LastName = lastName,
        MiddleName = profileData.ContainsKey("middleName") ? profileData["middleName"]?.ToString() : null,
        Gender = profileData.ContainsKey("gender") ? profileData["gender"]?.ToString() : null,
        DateOfBirth = !string.IsNullOrWhiteSpace(dob) ? DateTime.Parse(dob) : null,
        Phone = phone ?? "",
        Email = profileData.ContainsKey("email") ? profileData["email"]?.ToString() : null,
        GovtIdType = profileData.ContainsKey("govtIdType") ? profileData["govtIdType"]?.ToString() : null,
        GovtIdNumber = profileData.ContainsKey("govtIdNumber") ? profileData["govtIdNumber"]?.ToString() : null,
        EmpiScore = empiResponse.score,
        EmpiStatus = empiResponse.score >= 50 ? "flagged_for_review" : "verified",
        VerifiedMethod = "self_registration",
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };
    
    db.Patients.Add(patient);
    
    // Create user record
    var user = new User
    {
        UserId = Guid.NewGuid(),
        PatientId = patient.Id,
        Email = patient.Email,
        PhoneNormalized = phone,
        MfaEnabled = false,
        CreatedAt = DateTime.UtcNow
    };
    
    db.Users.Add(user);
    
    // Hash password using Argon2id
    var pepper = Environment.GetEnvironmentVariable("ARGON2_PEPPER") ?? "";
    var passwordHash = await PasswordHelper.HashPasswordAsync(password, pepper);
    
    // Create credential record
    var credential = new Credential
    {
        CredentialId = Guid.NewGuid(),
        UserId = user.UserId,
        CredentialType = "password",
        PasswordHash = passwordHash,
        CreatedAt = DateTime.UtcNow
    };
    
    db.Credentials.Add(credential);
    
    // Audit Log
    db.AuditLogs.Add(new AuditLog
    {
        PatientId = patient.Id,
        Actor = "system",
        Action = "patient_registered",
        Details = $"{{\"empiScore\":{empiResponse.score},\"method\":\"self_registration\"}}",
        Ip = http.Connection.RemoteIpAddress?.ToString(),
        UserAgent = http.Request.Headers["User-Agent"].FirstOrDefault(),
        CreatedAt = DateTime.UtcNow
    });
    
    await db.SaveChangesAsync();
    
    // Generate JWT tokens
    var accessToken = jwtService.GenerateAccessToken(
        user.UserId,
        upi,
        patient.Email
    );
    var refreshToken = jwtService.GenerateRefreshToken();
    
    // Store refresh token hash in link_token table for now
    var refreshTokenHash = Convert.ToHexString(
        System.Security.Cryptography.SHA256.HashData(
            System.Text.Encoding.UTF8.GetBytes(refreshToken)));
    
    var linkToken = new LinkToken
    {
        PatientId = patient.Id,
        TokenHash = refreshTokenHash,
        ExpiresAt = DateTime.UtcNow.AddDays(7),
        CreatedAt = DateTime.UtcNow
    };
    
    db.LinkTokens.Add(linkToken);
    await db.SaveChangesAsync();
    
    return Results.Ok(new
    {
        status = "registered",
        patientId = patient.Id,
        upi,
        accessToken,
        refreshToken,
        expiresIn = 7200, // 2 hours in seconds
        user = new
        {
            id = user.UserId,
            upi,
            email = patient.Email,
            firstName = patient.FirstName,
            lastName = patient.LastName,
            mfaEnabled = user.MfaEnabled
        }
    });
});

// Helper method for EMPI check
async Task<(decimal score, List<object> matches)> PerformEmpiCheckAsync(AppDbContext db, object request)
{
    var reqDict = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string,string>>(
        System.Text.Json.JsonSerializer.Serialize(request)
    ) ?? new();
    
    var firstName = reqDict.ContainsKey("firstName") ? reqDict["firstName"] : null;
    var lastName = reqDict.ContainsKey("lastName") ? reqDict["lastName"] : null;
    var dob = reqDict.ContainsKey("dob") ? reqDict["dob"] : null;
    var phone = reqDict.ContainsKey("phone") ? reqDict["phone"] : null;
    var email = reqDict.ContainsKey("email") ? reqDict["email"] : null;
    var govtIdType = reqDict.ContainsKey("govtIdType") ? reqDict["govtIdType"] : null;
    var govtIdNumber = reqDict.ContainsKey("govtIdNumber") ? reqDict["govtIdNumber"] : null;
    
    decimal maxScore = 0;
    var matches = new List<object>();
    
    // Government ID exact match = 100 points (instant block)
    if (!string.IsNullOrWhiteSpace(govtIdType) && !string.IsNullOrWhiteSpace(govtIdNumber))
    {
        var govtIdMatch = await db.Patients
            .Where(p => p.GovtIdType == govtIdType && p.GovtIdNumber == govtIdNumber)
            .FirstOrDefaultAsync();
            
        if (govtIdMatch != null)
        {
            return (100, new List<object> { new { patientId = govtIdMatch.Id, score = 100 } });
        }
    }
    
    // Demographics matching
    var candidates = await db.Patients
        .Where(p => p.FirstName != null && p.LastName != null)
        .ToListAsync();
    
    foreach (var candidate in candidates)
    {
        decimal score = 0;
        
        // First name similarity (25 points)
        if (!string.IsNullOrWhiteSpace(firstName) && !string.IsNullOrWhiteSpace(candidate.FirstName))
        {
            var similarity = CalculateJaroWinkler(firstName.ToLower(), candidate.FirstName.ToLower());
            score += (decimal)(similarity * 25);
        }
        
        // Last name similarity (25 points)
        if (!string.IsNullOrWhiteSpace(lastName) && !string.IsNullOrWhiteSpace(candidate.LastName))
        {
            var similarity = CalculateJaroWinkler(lastName.ToLower(), candidate.LastName.ToLower());
            score += (decimal)(similarity * 25);
        }
        
        // DOB exact match (30 points)
        if (!string.IsNullOrWhiteSpace(dob) && candidate.DateOfBirth.HasValue)
        {
            if (DateTime.Parse(dob).Date == candidate.DateOfBirth.Value.Date)
                score += 30;
        }
        
        // Gender exact match (10 points)
        if (!string.IsNullOrWhiteSpace(reqDict.ContainsKey("gender") ? reqDict["gender"] : null) && 
            !string.IsNullOrWhiteSpace(candidate.Gender))
        {
            if (reqDict["gender"]?.ToLower() == candidate.Gender?.ToLower())
                score += 10;
        }
        
        // Contact info (supporting evidence, max 15 points)
        if (!string.IsNullOrWhiteSpace(phone) && !string.IsNullOrWhiteSpace(candidate.Phone))
        {
            if (phone == candidate.Phone)
                score += 7;
        }
        
        if (!string.IsNullOrWhiteSpace(email) && !string.IsNullOrWhiteSpace(candidate.Email))
        {
            if (email.ToLower() == candidate.Email.ToLower())
                score += 5;
        }
        
        if (score > maxScore)
            maxScore = score;
            
        if (score >= 50)
        {
            matches.Add(new { patientId = candidate.Id, score });
        }
    }
    
    return (maxScore, matches);
}

// Jaro-Winkler similarity algorithm
double CalculateJaroWinkler(string s1, string s2)
{
    if (s1 == s2) return 1.0;
    if (s1.Length == 0 || s2.Length == 0) return 0.0;
    
    int matchDistance = Math.Max(s1.Length, s2.Length) / 2 - 1;
    bool[] s1Matches = new bool[s1.Length];
    bool[] s2Matches = new bool[s2.Length];
    int matches = 0;
    int transpositions = 0;
    
    for (int i = 0; i < s1.Length; i++)
    {
        int start = Math.Max(0, i - matchDistance);
        int end = Math.Min(i + matchDistance + 1, s2.Length);
        
        for (int j = start; j < end; j++)
        {
            if (s2Matches[j] || s1[i] != s2[j]) continue;
            s1Matches[i] = true;
            s2Matches[j] = true;
            matches++;
            break;
        }
    }
    
    if (matches == 0) return 0.0;
    
    int k = 0;
    for (int i = 0; i < s1.Length; i++)
    {
        if (!s1Matches[i]) continue;
        while (!s2Matches[k]) k++;
        if (s1[i] != s2[k]) transpositions++;
        k++;
    }
    
    double jaro = ((double)matches / s1.Length + (double)matches / s2.Length + 
                   (matches - transpositions / 2.0) / matches) / 3.0;
    
    // Winkler modification
    int prefixLength = 0;
    for (int i = 0; i < Math.Min(s1.Length, s2.Length) && i < 4; i++)
    {
        if (s1[i] == s2[i]) prefixLength++;
        else break;
    }
    
    return jaro + prefixLength * 0.1 * (1.0 - jaro);
}

app.Run();