using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AuthService.Models
{
    [Table("users")]
    public class User
    {
        [Key]
        [Column("user_id")]
        public Guid UserId { get; set; } = Guid.NewGuid();
        
        [Column("patient_id")]
        public Guid? PatientId { get; set; }
        
        [Column("display_name")]
        public string? DisplayName { get; set; }
        
        [Column("email")]
        public string? Email { get; set; }
        
        [Column("phone_normalized")]
        public string? PhoneNormalized { get; set; }
        
        [Column("is_locked")]
        public bool IsLocked { get; set; } = false;
        
        [Column("mfa_enabled")]
        public bool MfaEnabled { get; set; } = false;
        
        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        [Column("last_login")]
        public DateTime? LastLogin { get; set; }
    }
}
