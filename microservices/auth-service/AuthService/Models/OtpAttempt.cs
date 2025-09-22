using System;
using System.ComponentModel.DataAnnotations;

namespace AuthService.Models
{
    public class OtpAttempt
    {
        [Key]
        public long Id { get; set; }
        public string Phone { get; set; } = null!;
        public string? OtpHash { get; set; }
        public string? Nonce { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public int Attempts { get; set; } = 0;
        public int ResendCount { get; set; } = 0;
        public string Status { get; set; } = "pending";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}