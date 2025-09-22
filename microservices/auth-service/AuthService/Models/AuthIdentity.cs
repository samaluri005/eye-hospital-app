using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AuthService.Models;

[Table("auth_identities")]
public class AuthIdentity
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Required]
    [Column("patient_id")]
    public int PatientId { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("provider")]
    public string Provider { get; set; } = string.Empty; // "phone", "email", "google", "apple"

    [Required]
    [MaxLength(255)]
    [Column("provider_subject")]
    public string ProviderSubject { get; set; } = string.Empty; // phone number, email, or external user ID

    [Column("verified_at")]
    public DateTime? VerifiedAt { get; set; }

    [Column("is_primary")]
    public bool IsPrimary { get; set; } = false;

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("last_used_at")]
    public DateTime? LastUsedAt { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("PatientId")]
    public virtual Patient Patient { get; set; } = null!;

    public virtual ICollection<OtpAttempt> OtpAttempts { get; set; } = new List<OtpAttempt>();
}