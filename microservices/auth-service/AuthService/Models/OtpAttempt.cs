using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AuthService.Models;

[Table("otp_attempts")]
public class OtpAttempt
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Required]
    [Column("patient_id")]
    public int PatientId { get; set; }

    [Column("auth_identity_id")]
    public int? AuthIdentityId { get; set; }

    [Required]
    [MaxLength(10)]
    [Column("otp_code")]
    public string OtpCode { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    [Column("purpose")]
    public string Purpose { get; set; } = string.Empty; // "login", "registration", "password_reset"

    [Column("expires_at")]
    public DateTime ExpiresAt { get; set; }

    [Column("verified_at")]
    public DateTime? VerifiedAt { get; set; }

    [Column("attempts")]
    public int Attempts { get; set; } = 0;

    [Column("max_attempts")]
    public int MaxAttempts { get; set; } = 3;

    [Column("is_used")]
    public bool IsUsed { get; set; } = false;

    [MaxLength(45)]
    [Column("ip_address")]
    public string? IpAddress { get; set; }

    [MaxLength(500)]
    [Column("user_agent")]
    public string? UserAgent { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("PatientId")]
    public virtual Patient Patient { get; set; } = null!;

    [ForeignKey("AuthIdentityId")]
    public virtual AuthIdentity? AuthIdentity { get; set; }
}