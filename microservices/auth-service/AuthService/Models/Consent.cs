using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AuthService.Models;

[Table("consents")]
public class Consent
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Required]
    [Column("patient_id")]
    public int PatientId { get; set; }

    [Required]
    [MaxLength(100)]
    [Column("consent_type")]
    public string ConsentType { get; set; } = string.Empty; // "terms", "privacy", "marketing", "sms", "email"

    [Required]
    [Column("version")]
    public string Version { get; set; } = string.Empty; // Version of the consent document

    [Column("granted")]
    public bool Granted { get; set; } = false;

    [Column("granted_at")]
    public DateTime? GrantedAt { get; set; }

    [Column("revoked_at")]
    public DateTime? RevokedAt { get; set; }

    [MaxLength(45)]
    [Column("ip_address")]
    public string? IpAddress { get; set; }

    [MaxLength(500)]
    [Column("user_agent")]
    public string? UserAgent { get; set; }

    [MaxLength(1000)]
    [Column("notes")]
    public string? Notes { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("PatientId")]
    public virtual Patient Patient { get; set; } = null!;
}