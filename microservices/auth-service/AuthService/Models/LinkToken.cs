using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AuthService.Models
{
    [Table("link_token")]
    public class LinkToken
    {
        [Key]
        [Column("id")]
        public long Id { get; set; }

        [Column("patient_id")]
        public Guid PatientId { get; set; }

        // HMAC (sha256) hex of the token (do not store plaintext token)
        [Column("token_hash")]
        public string TokenHash { get; set; } = null!;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("expires_at")]
        public DateTime ExpiresAt { get; set; }

        [Column("used")]
        public bool Used { get; set; } = false;

        [Column("used_at")]
        public DateTime? UsedAt { get; set; }
    }
}