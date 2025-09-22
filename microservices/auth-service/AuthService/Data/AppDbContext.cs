using Microsoft.EntityFrameworkCore;
using AuthService.Models;

namespace AuthService.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> opts) : base(opts) { }

        public DbSet<Patient> Patients { get; set; } = default!;
        public DbSet<AuthIdentity> AuthIdentities { get; set; } = default!;
        public DbSet<OtpAttempt> OtpAttempts { get; set; } = default!;
        public DbSet<Consent> Consents { get; set; } = default!;
        public DbSet<Device> Devices { get; set; } = default!;
        public DbSet<AuditLog> AuditLogs { get; set; } = default!;

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // Configure table names to match the migration
            builder.Entity<Patient>().ToTable("patient");
            builder.Entity<AuthIdentity>().ToTable("auth_identity");
            builder.Entity<OtpAttempt>().ToTable("otp_attempt");
            builder.Entity<Consent>().ToTable("consent");
            builder.Entity<Device>().ToTable("device");
            builder.Entity<AuditLog>().ToTable("audit_log");

            builder.Entity<Patient>()
                .HasIndex(p => p.Phone)
                .IsUnique();

            builder.Entity<Patient>()
                .HasIndex(p => p.Email)
                .IsUnique();

            builder.Entity<AuthIdentity>()
                .HasIndex(a => new { a.Provider, a.ProviderSubject })
                .IsUnique();

            builder.Entity<OtpAttempt>()
                .HasIndex(o => o.Phone);

            builder.Entity<Consent>()
                .HasIndex(c => c.PatientId);

            builder.Entity<Device>()
                .HasIndex(d => d.PatientId);

            builder.Entity<AuditLog>()
                .HasIndex(a => new { a.PatientId, a.CreatedAt });
        }
    }
}