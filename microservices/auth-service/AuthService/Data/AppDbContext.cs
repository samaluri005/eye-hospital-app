using Microsoft.EntityFrameworkCore;
using AuthService.Models;

namespace AuthService.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    // DbSets for all entities
    public DbSet<Patient> Patients { get; set; }
    public DbSet<AuthIdentity> AuthIdentities { get; set; }
    public DbSet<OtpAttempt> OtpAttempts { get; set; }
    public DbSet<Consent> Consents { get; set; }
    public DbSet<Device> Devices { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure Patient entity
        modelBuilder.Entity<Patient>(entity =>
        {
            entity.HasIndex(e => e.UserId).IsUnique();
            entity.HasIndex(e => e.Email);
            entity.HasIndex(e => e.Phone);
        });

        // Configure AuthIdentity entity
        modelBuilder.Entity<AuthIdentity>(entity =>
        {
            entity.HasIndex(e => new { e.Provider, e.ProviderId }).IsUnique();
            entity.HasIndex(e => e.PatientId);
            
            entity.HasOne(d => d.Patient)
                .WithMany(p => p.AuthIdentities)
                .HasForeignKey(d => d.PatientId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure OtpAttempt entity
        modelBuilder.Entity<OtpAttempt>(entity =>
        {
            entity.HasIndex(e => e.PatientId);
            entity.HasIndex(e => e.OtpCode);
            entity.HasIndex(e => e.ExpiresAt);
            
            entity.HasOne(d => d.Patient)
                .WithMany(p => p.OtpAttempts)
                .HasForeignKey(d => d.PatientId)
                .OnDelete(DeleteBehavior.Cascade);
                
            entity.HasOne(d => d.AuthIdentity)
                .WithMany(p => p.OtpAttempts)
                .HasForeignKey(d => d.AuthIdentityId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // Configure Consent entity
        modelBuilder.Entity<Consent>(entity =>
        {
            entity.HasIndex(e => e.PatientId);
            entity.HasIndex(e => new { e.PatientId, e.ConsentType, e.Version });
            
            entity.HasOne(d => d.Patient)
                .WithMany(p => p.Consents)
                .HasForeignKey(d => d.PatientId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure Device entity
        modelBuilder.Entity<Device>(entity =>
        {
            entity.HasIndex(e => e.PatientId);
            entity.HasIndex(e => e.DeviceToken).IsUnique();
            entity.HasIndex(e => e.Platform);
            
            entity.HasOne(d => d.Patient)
                .WithMany(p => p.Devices)
                .HasForeignKey(d => d.PatientId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure AuditLog entity
        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasIndex(e => e.PatientId);
            entity.HasIndex(e => e.Action);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => new { e.Resource, e.ResourceId });
            
            entity.HasOne(d => d.Patient)
                .WithMany(p => p.AuditLogs)
                .HasForeignKey(d => d.PatientId)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }
}