using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AuthService.Models
{
    [Table("audit_log")]
    public class AuditLog
    {
        [Key]
        [Column("id")]
        public long Id { get; set; }
        
        [Column("patient_id")]
        public Guid? PatientId { get; set; }
        
        [Column("actor")]
        public string? Actor { get; set; }
        
        [Column("action")]
        public string Action { get; set; } = null!;
        
        [Column("details")]
        public string? Details { get; set; }
        
        [Column("ip")]
        public string? Ip { get; set; }
        
        [Column("user_agent")]
        public string? UserAgent { get; set; }
        
        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}