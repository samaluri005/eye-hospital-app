using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AuthService.Models
{
    [Table("otp_attempt")]
    public class OtpAttempt
    {
        [Key]
        public long Id { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? OtpHash { get; set; }
        public string? Nonce { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public int Attempts { get; set; } = 0;
        public int ResendCount { get; set; } = 0;
        public string Status { get; set; } = "pending";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}