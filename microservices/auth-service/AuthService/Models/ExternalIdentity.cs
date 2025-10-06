using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AuthService.Models
{
    [Table("external_identities")]
    public class ExternalIdentity
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [Column("user_id")]
        public Guid UserId { get; set; }
        
        [Column("provider")]
        public string Provider { get; set; } = null!;
        
        [Column("provider_sub")]
        public string ProviderSub { get; set; } = null!;
        
        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
