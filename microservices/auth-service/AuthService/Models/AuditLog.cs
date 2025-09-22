using System;
using System.ComponentModel.DataAnnotations;
namespace AuthService.Models
{
    public class AuditLog
    {
        [Key]
        public long Id { get; set; }
        public Guid? PatientId { get; set; }
        public string? Actor { get; set; }
        public string Action { get; set; } = null!;
        public string? Details { get; set; }
        public string? Ip { get; set; }
        public string? UserAgent { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}