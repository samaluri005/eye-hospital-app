using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AuthService.Models;

[Table("devices")]
public class Device
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Required]
    [Column("patient_id")]
    public int PatientId { get; set; }

    [Required]
    [MaxLength(255)]
    [Column("device_token")]
    public string DeviceToken { get; set; } = string.Empty; // FCM token, APNS token, etc.

    [Required]
    [MaxLength(50)]
    [Column("platform")]
    public string Platform { get; set; } = string.Empty; // "ios", "android", "web"

    [MaxLength(100)]
    [Column("device_name")]
    public string? DeviceName { get; set; } // User-friendly device name

    [MaxLength(500)]
    [Column("user_agent")]
    public string? UserAgent { get; set; }

    [MaxLength(100)]
    [Column("app_version")]
    public string? AppVersion { get; set; }

    [MaxLength(100)]
    [Column("os_version")]
    public string? OsVersion { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("last_used_at")]
    public DateTime? LastUsedAt { get; set; }

    [MaxLength(45)]
    [Column("last_ip_address")]
    public string? LastIpAddress { get; set; }

    [Column("push_notifications_enabled")]
    public bool PushNotificationsEnabled { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("PatientId")]
    public virtual Patient Patient { get; set; } = null!;
}