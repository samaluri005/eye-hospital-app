"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface ConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "terms" | "privacy" | "hipaa" | "authorization";
}

const CONSENT_CONTENT = {
  terms: {
    title: "Terms of Service",
    content: `
# Terms of Service

**Last Updated: October 2025**

## 1. Acceptance of Terms
By creating an account and using Eye Care Hospital's patient portal, you agree to be bound by these Terms of Service.

## 2. Use of Services
You agree to:
- Provide accurate and complete information
- Maintain the security of your account credentials
- Use the services only for lawful purposes
- Not share your Health ID or password with others

## 3. Account Responsibilities
You are responsible for:
- All activities under your account
- Keeping your contact information up to date
- Notifying us of any unauthorized access
- Maintaining confidentiality of your Health ID

## 4. Medical Disclaimer
This portal provides access to your health information and appointment scheduling. It does not:
- Provide medical advice or emergency services
- Replace in-person consultations with healthcare providers
- Guarantee immediate responses to queries

## 5. Privacy and Data Protection
Your health information is protected under HIPAA and our Privacy Policy. We collect and use your data only as described in our privacy practices.

## 6. Modifications
We reserve the right to modify these terms. Continued use after modifications constitutes acceptance of the new terms.

## 7. Contact
For questions about these terms, contact our support team.
    `
  },
  privacy: {
    title: "Privacy Policy",
    content: `
# Privacy Policy

**Last Updated: October 2025**

## 1. Information We Collect
We collect information you provide directly, including:
- Personal identification (name, date of birth, contact details)
- Health ID and authentication credentials
- Medical records and health information
- Communication preferences
- Device and usage information

## 2. How We Use Your Information
Your information is used to:
- Provide and improve healthcare services
- Schedule and manage appointments
- Communicate health updates and reminders
- Ensure security and prevent fraud
- Comply with legal and regulatory requirements

## 3. Information Sharing
We share your information only:
- With healthcare providers involved in your care
- As required by law or regulation
- With your explicit consent
- With service providers under strict confidentiality agreements

## 4. Your Rights
You have the right to:
- Access your personal and health information
- Request corrections to your data
- Opt out of non-essential communications
- Request deletion of your account (subject to legal requirements)

## 5. Data Security
We implement industry-standard security measures including:
- Encrypted data transmission and storage
- Multi-factor authentication options
- Regular security audits
- Staff training on data protection

## 6. Cookies and Tracking
We use essential cookies for authentication and security. We do not use tracking cookies for advertising purposes.

## 7. Children's Privacy
Accounts for minors require guardian consent and supervision.

## 8. Changes to Policy
We will notify you of significant changes to this privacy policy.

## 9. Contact
For privacy concerns, contact our Data Protection Officer.
    `
  },
  hipaa: {
    title: "HIPAA Notice of Privacy Practices",
    content: `
# HIPAA Notice of Privacy Practices

**Effective Date: October 2025**

## YOUR RIGHTS UNDER HIPAA

### Right to Access
You have the right to inspect and obtain copies of your Protected Health Information (PHI) maintained by Eye Care Hospital.

### Right to Amend
You may request amendments to your health records if you believe they are incorrect or incomplete.

### Right to Accounting of Disclosures
You may request a list of certain disclosures of your PHI made by us.

### Right to Request Restrictions
You may request restrictions on how we use or disclose your PHI for treatment, payment, or healthcare operations.

### Right to Confidential Communications
You may request to receive communications of PHI in a certain manner or at a certain location.

## HOW WE USE YOUR HEALTH INFORMATION

### Treatment
We use your PHI to provide, coordinate, and manage your healthcare and related services.

### Payment
We use your PHI for billing and payment activities, including claims processing and insurance verification.

### Healthcare Operations
We use your PHI for quality improvement, staff training, and business management.

### Required by Law
We may disclose PHI when required by federal, state, or local law.

### Public Health Activities
We may disclose PHI for public health purposes such as disease prevention and reporting.

### Business Associates
We may share PHI with contractors who assist in healthcare operations, under strict confidentiality agreements.

## YOUR AUTHORIZATION
We will obtain your written authorization for uses and disclosures not covered by this notice or applicable law.

## SECURITY MEASURES
We maintain physical, electronic, and procedural safeguards to protect your PHI:
- Secure, encrypted electronic systems
- Restricted facility access
- Staff training on privacy practices
- Regular security assessments

## BREACH NOTIFICATION
We will notify you promptly if a breach of your unsecured PHI occurs.

## COMPLAINTS
If you believe your privacy rights have been violated, you may file a complaint with:
- Eye Care Hospital Privacy Officer
- U.S. Department of Health and Human Services

## CONTACT INFORMATION
Privacy Officer: [Hospital Contact]
Phone: [Hospital Phone]
Email: [Hospital Email]

You will not be retaliated against for filing a complaint.
    `
  },
  authorization: {
    title: "Authorization for Use of Health Information",
    content: `
# Authorization for Use and Disclosure of Health Information

**Eye Care Hospital Patient Portal**

## PURPOSE OF AUTHORIZATION

This authorization permits Eye Care Hospital to use and disclose your Protected Health Information (PHI) for the purposes of treatment, payment, and healthcare operations as described below.

## SCOPE OF AUTHORIZATION

### Treatment
**You authorize us to:**
- Share your health information with physicians, nurses, and other healthcare providers involved in your care
- Coordinate care with specialists, laboratories, and imaging centers
- Provide your medical history to healthcare providers treating you
- Communicate test results and treatment recommendations

### Payment
**You authorize us to:**
- Submit claims to your insurance company
- Verify insurance coverage and benefits
- Process payments and billing statements
- Coordinate with insurance providers for pre-authorizations

### Healthcare Operations
**You authorize us to:**
- Conduct quality improvement activities
- Perform clinical audits and reviews
- Provide training to healthcare staff
- Manage appointments and administrative functions

## WHAT THIS MEANS

By accepting this authorization, you understand that:
- Your health information may be shared with authorized healthcare providers, insurance companies, and business associates
- Information disclosed may be subject to re-disclosure by the recipient
- This authorization remains in effect unless you revoke it in writing
- Revocation will not affect information already disclosed under this authorization
- You may refuse to sign this authorization, but we may not be able to provide certain services

## ELECTRONIC COMMUNICATIONS

You authorize us to:
- Send appointment reminders via SMS or email (if you provided contact information)
- Deliver lab results and health updates through the secure patient portal
- Send billing statements and payment reminders

## EXPIRATION

This authorization remains valid until you revoke it or terminate your patient relationship with Eye Care Hospital.

## REVOCATION

You may revoke this authorization at any time by submitting a written request to our Privacy Officer. Revocation will not affect past uses and disclosures.

## QUESTIONS

If you have questions about this authorization or how your health information is used, please contact our Privacy Officer.

---

**By checking the authorization box, you acknowledge that you have read and understood this authorization and agree to its terms.**
    `
  }
};

export default function ConsentModal({ isOpen, onClose, type }: ConsentModalProps) {
  const content = CONSENT_CONTENT[type];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />
          
          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900">{content.title}</h3>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-h1:text-lg prose-h1:font-bold prose-h1:mb-4 prose-h2:text-base prose-h2:font-semibold prose-h2:mt-6 prose-h2:mb-3 prose-h3:text-sm prose-h3:font-medium prose-h3:mt-4 prose-h3:mb-2 prose-p:text-gray-700 prose-p:leading-relaxed prose-strong:text-gray-900 prose-ul:text-gray-700 prose-li:text-gray-700">
                  {content.content.split('\n').map((line, index) => {
                    if (line.startsWith('# ')) {
                      return <h1 key={index}>{line.substring(2)}</h1>;
                    } else if (line.startsWith('## ')) {
                      return <h2 key={index}>{line.substring(3)}</h2>;
                    } else if (line.startsWith('### ')) {
                      return <h3 key={index}>{line.substring(4)}</h3>;
                    } else if (line.startsWith('**') && line.endsWith('**')) {
                      return <p key={index}><strong>{line.substring(2, line.length - 2)}</strong></p>;
                    } else if (line.trim() === '') {
                      return <br key={index} />;
                    } else if (line.startsWith('- ')) {
                      return <li key={index}>{line.substring(2)}</li>;
                    } else {
                      return <p key={index}>{line}</p>;
                    }
                  })}
                </div>
              </div>
              
              {/* Footer */}
              <div className="p-6 border-t border-gray-200">
                <button
                  onClick={onClose}
                  className="w-full py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
