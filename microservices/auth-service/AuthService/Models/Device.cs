using System;
using System.ComponentModel.DataAnnotations;

namespace AuthService.Models
{
    public class Device
    {
        [Key]
        public long Id { get; set; }
        public Guid PatientId { get; set; }
        public string DeviceId { get; set; } = null!;
        public string? DevicePublicKey { get; set; }
        public string? DisplayName { get; set; }
        public DateTime RegisteredAt { get; set; } = DateTime.UtcNow;
        public DateTime? LastUsedAt { get; set; }
        public string Status { get; set; } = "active";
    }
}