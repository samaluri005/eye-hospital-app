using System;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using AuthService.Data;
using AuthService.Models;
using Microsoft.EntityFrameworkCore;

namespace AuthService.Services
{
    public static class LinkTokenHelper
    {
        // Generate secure random token for one-time use
        public static string GenerateTokenPlaintext(int byteSize = 32)
        {
            var bytes = RandomNumberGenerator.GetBytes(byteSize);
            // URL-friendly base64 (replace +/ with -_)
            return Convert.ToBase64String(bytes).Replace("+", "-").Replace("/", "_").TrimEnd('=');
        }

        public static string ComputeHmacHex(string secret, string tokenPlain)
        {
            var key = Encoding.UTF8.GetBytes(secret);
            using var hmac = new HMACSHA256(key);
            var tokenBytes = Encoding.UTF8.GetBytes(tokenPlain);
            var hash = hmac.ComputeHash(tokenBytes);
            return BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
        }

        // Store link token hash in DB with TTL
        public static async Task<string> CreateAndStoreLinkTokenAsync(AppDbContext db, Guid patientId, string secret, TimeSpan ttl)
        {
            var plainToken = GenerateTokenPlaintext();
            var tokenHash = ComputeHmacHex(secret, plainToken);

            var linkToken = new LinkToken
            {
                PatientId = patientId,
                TokenHash = tokenHash,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.Add(ttl),
                Used = false
            };

            db.LinkTokens.Add(linkToken);
            await db.SaveChangesAsync();

            // Return plaintext to send back to client (one-time only)
            return plainToken;
        }

        // Validate token for patient and mark used atomically
        public static async Task<bool> ValidateAndConsumeLinkTokenAsync(AppDbContext db, Guid patientId, string tokenPlain, string secret)
        {
            var expectedHash = ComputeHmacHex(secret, tokenPlain);

            // Find matching token for patient that is not used and not expired
            var tokenEntry = await db.LinkTokens
                .FirstOrDefaultAsync(t => t.PatientId == patientId && 
                                         t.TokenHash == expectedHash && 
                                         !t.Used && 
                                         t.ExpiresAt > DateTime.UtcNow);

            if (tokenEntry == null) return false;

            // Mark token as used atomically
            tokenEntry.Used = true;
            tokenEntry.UsedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            
            return true;
        }

        // Clean up expired tokens (call periodically)
        public static async Task CleanupExpiredTokensAsync(AppDbContext db)
        {
            var expiredTokens = db.LinkTokens.Where(t => t.ExpiresAt <= DateTime.UtcNow);
            db.LinkTokens.RemoveRange(expiredTokens);
            await db.SaveChangesAsync();
        }
    }
}