using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AuthService.Models;

[Table("audit_logs")]
public class AuditLog
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("patient_id")]
    public int? PatientId { get; set; }

    [Required]
    [MaxLength(100)]
    [Column("action")]
    public string Action { get; set; } = string.Empty; // "login", "logout", "registration", "password_change", etc.

    [Required]
    [MaxLength(100)]
    [Column("resource")]
    public string Resource { get; set; } = string.Empty; // "auth", "patient", "appointment", etc.

    [MaxLength(255)]
    [Column("resource_id")]
    public string? ResourceId { get; set; } // ID of the affected resource

    [Required]
    [MaxLength(50)]
    [Column("result")]
    public string Result { get; set; } = string.Empty; // "success", "failure", "blocked"

    [MaxLength(1000)]
    [Column("details")]
    public string? Details { get; set; } // Additional context or error messages

    [MaxLength(45)]
    [Column("ip_address")]
    public string? IpAddress { get; set; }

    [MaxLength(500)]
    [Column("user_agent")]
    public string? UserAgent { get; set; }

    [MaxLength(255)]
    [Column("session_id")]
    public string? SessionId { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("PatientId")]
    public virtual Patient? Patient { get; set; }
}