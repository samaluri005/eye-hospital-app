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
        
        [Column("upi")]
        public string? Upi { get; set; }
        
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
        public string Status { get; set; } = "active";
        
        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Phase 1 PDF Requirements: CDC and EMPI fields (NEW)
        [Column("first_name")]
        public string? FirstName { get; set; }
        
        [Column("middle_name")]
        public string? MiddleName { get; set; }
        
        [Column("last_name")]
        public string? LastName { get; set; }
        
        [Column("gender")]
        public string? Gender { get; set; }
        
        [Column("addresses", TypeName = "jsonb")]
        public string? Addresses { get; set; } // JSONB: [{"type":"home","line1":"..."}]
        
        [Column("identifiers", TypeName = "jsonb")]
        public string? Identifiers { get; set; } // JSONB: [{"system":"SSN","value":"***"}]
        
        [Column("empi_score")]
        public decimal? EmpiScore { get; set; }
        
        [Column("empi_status")]
        public string EmpiStatus { get; set; } = "unknown"; // 'unknown', 'verified', 'duplicate_suspected'
        
        [Column("verified_method")]
        public string? VerifiedMethod { get; set; } // 'gov_id', 'biometric', 'staff_attestation'
        
        [Column("verified_by")]
        public Guid? VerifiedBy { get; set; } // Staff user_id who verified identity
        
        [Column("verification_at")]
        public DateTime? VerificationAt { get; set; }
        
        // Government ID fields for EMPI duplicate detection
        [Column("govt_id_type")]
        public string? GovtIdType { get; set; } // 'aadhaar', 'passport', 'voter_id', 'driving_license'
        
        [Column("govt_id_number")]
        public string? GovtIdNumber { get; set; }
    }
}