using System;
using System.ComponentModel.DataAnnotations;

namespace AuthService.Models
{
    public class Consent
    {
        [Key]
        public long Id { get; set; }
        public Guid PatientId { get; set; }
        public string ConsentType { get; set; } = null!;
        public string Version { get; set; } = null!;
        public string ConsentTextHash { get; set; } = null!;
        public bool Accepted { get; set; } = false;
        public DateTime? AcceptedAt { get; set; }
        public DateTime? RevokedAt { get; set; }
        public string? AcceptedIp { get; set; }
        public string? AcceptedUserAgent { get; set; }
    }
}