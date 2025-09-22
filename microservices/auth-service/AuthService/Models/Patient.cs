using System;
using System.ComponentModel.DataAnnotations;

namespace AuthService.Models
{
    public class Patient
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Phone { get; set; } = null!;
        public string? Email { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}