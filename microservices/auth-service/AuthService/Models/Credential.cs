using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AuthService.Models
{
    [Table("credentials")]
    public class Credential
    {
        [Key]
        [Column("credential_id")]
        public Guid CredentialId { get; set; } = Guid.NewGuid();
        
        [Column("user_id")]
        public Guid UserId { get; set; }
        
        [Column("credential_type")]
        public string CredentialType { get; set; } = null!;
        
        [Column("password_hash")]
        public string? PasswordHash { get; set; }
        
        [Column("password_salt")]
        public string? PasswordSalt { get; set; }
        
        [Column("pin_hash")]
        public string? PinHash { get; set; }
        
        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        [Column("last_used_at")]
        public DateTime? LastUsedAt { get; set; }
    }
}
