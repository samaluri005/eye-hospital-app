using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AuthService.Models
{
    [Table("patient")]
    public class Patient
    {
        [Key]
        [Column("patient_id")]
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [Column("phone")]
        public string Phone { get; set; } = null!;
        
        [Column("email")]
        public string? Email { get; set; }
        
        [Column("full_name")]
        public string? FullName { get; set; }
        
        [Column("dob")]
        public DateTime? DateOfBirth { get; set; }
        
        [Column("mrn_encrypted")]
        public byte[]? MrnEncrypted { get; set; }
        
        [Column("status")]
        public string? Status { get; set; }
        
        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}