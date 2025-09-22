using System;
using System.ComponentModel.DataAnnotations;

namespace AuthService.Models
{
    public class AuthIdentity
    {
        [Key]
        public long Id { get; set; }
        public Guid PatientId { get; set; }
        public string Provider { get; set; } = null!;
        public string ProviderSubject { get; set; } = null!;
        public DateTime? VerifiedAt { get; set; }
        public bool IsPrimary { get; set; } = false;
        public bool IsActive { get; set; } = true;
        public DateTime? LastUsedAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}