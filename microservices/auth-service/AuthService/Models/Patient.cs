using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AuthService.Models;

[Table("patients")]
public class Patient
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Required]
    [Column("user_id")]
    public int UserId { get; set; }

    [Required]
    [MaxLength(100)]
    [Column("first_name")]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    [Column("last_name")]
    public string LastName { get; set; } = string.Empty;

    [MaxLength(255)]
    [Column("email")]
    public string? Email { get; set; }

    [MaxLength(20)]
    [Column("phone")]
    public string? Phone { get; set; }

    [Column("date_of_birth")]
    public DateTime? DateOfBirth { get; set; }

    [MaxLength(255)]
    [Column("address")]
    public string? Address { get; set; }

    [MaxLength(100)]
    [Column("city")]
    public string? City { get; set; }

    [MaxLength(50)]
    [Column("state")]
    public string? State { get; set; }

    [MaxLength(20)]
    [Column("zip_code")]
    public string? ZipCode { get; set; }

    [Column("emergency_contact_name")]
    [MaxLength(200)]
    public string? EmergencyContactName { get; set; }

    [Column("emergency_contact_phone")]
    [MaxLength(20)]
    public string? EmergencyContactPhone { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public virtual ICollection<AuthIdentity> AuthIdentities { get; set; } = new List<AuthIdentity>();
    public virtual ICollection<OtpAttempt> OtpAttempts { get; set; } = new List<OtpAttempt>();
    public virtual ICollection<Consent> Consents { get; set; } = new List<Consent>();
    public virtual ICollection<Device> Devices { get; set; } = new List<Device>();
    public virtual ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
}