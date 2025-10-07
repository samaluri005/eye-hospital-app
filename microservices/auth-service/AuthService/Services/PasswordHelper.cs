using System;
using System.Security.Cryptography;
using System.Text;
using Konscious.Security.Cryptography;

namespace AuthService.Services
{
    public static class PasswordHelper
    {
        public static async Task<string> HashPasswordAsync(string password, string pepper)
        {
            var salt = RandomNumberGenerator.GetBytes(16);
            var passwordBytes = Encoding.UTF8.GetBytes(password + pepper);

            using var argon2 = new Argon2id(passwordBytes);
            argon2.Salt = salt;
            argon2.DegreeOfParallelism = 8;
            argon2.Iterations = 4;
            argon2.MemorySize = 65536; // 64 MB

            var hash = await argon2.GetBytesAsync(32);
            
            // Format: $argon2id$salt$hash (base64)
            return $"$argon2id${Convert.ToBase64String(salt)}${Convert.ToBase64String(hash)}";
        }

        public static async Task<bool> VerifyPasswordAsync(string password, string hashedPassword, string pepper)
        {
            if (string.IsNullOrEmpty(hashedPassword)) return false;

            // Check if it's Argon2id format
            if (hashedPassword.StartsWith("$argon2id$"))
            {
                var parts = hashedPassword.Split('$');
                if (parts.Length != 4) return false;

                var salt = Convert.FromBase64String(parts[2]);
                var expectedHash = Convert.FromBase64String(parts[3]);
                
                var passwordBytes = Encoding.UTF8.GetBytes(password + pepper);

                using var argon2 = new Argon2id(passwordBytes);
                argon2.Salt = salt;
                argon2.DegreeOfParallelism = 8;
                argon2.Iterations = 4;
                argon2.MemorySize = 65536;

                var hash = await argon2.GetBytesAsync(32);
                
                return CryptographicOperations.FixedTimeEquals(hash, expectedHash);
            }
            
            // Legacy bcrypt format (if needed in future)
            if (hashedPassword.StartsWith("$2"))
            {
                // TODO: Implement bcrypt verification if legacy passwords exist
                // For now, return false to force password reset
                return false;
            }

            return false;
        }
    }
}
