using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AuthService.Models
{
    [Table("family_access")]
    public class FamilyAccess
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }
        
        [Column("patient_id")]
        public Guid PatientId { get; set; }
        
        [Column("guardian_patient_id")]
        public Guid GuardianPatientId { get; set; }
        
        [Column("relationship")]
        public string Relationship { get; set; } = null!;
        
        [Column("access_level")]
        public string AccessLevel { get; set; } = null!;
        
        [Column("approved_at")]
        public DateTime? ApprovedAt { get; set; }
        
        [Column("expires_at")]
        public DateTime? ExpiresAt { get; set; }
        
        [Column("consent_document_url")]
        public string? ConsentDocumentUrl { get; set; }
        
        [Column("is_active")]
        public bool IsActive { get; set; } = true;
    }
}
