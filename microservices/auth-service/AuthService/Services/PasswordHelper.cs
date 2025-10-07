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
            var passwordBytes = Encoding.UTF8.GetBytes(password + pepper);

            using var argon2 = new Argon2id(passwordBytes);
            argon2.DegreeOfParallelism = 1;
            argon2.Iterations = 2;
            argon2.MemorySize = 19456;

            var hash = await argon2.GetBytesAsync(32);
            
            return Encoding.UTF8.GetString(hash);
        }

        private static string AddBase64Padding(string base64)
        {
            // Argon2 uses Base64 without padding, so add it back for .NET decoding
            switch (base64.Length % 4)
            {
                case 2: return base64 + "==";
                case 3: return base64 + "=";
                default: return base64;
            }
        }

        public static async Task<bool> VerifyPasswordAsync(string password, string hashedPassword, string pepper)
        {
            if (string.IsNullOrEmpty(hashedPassword)) return false;

            // Check if it's standard Argon2 format (from @node-rs/argon2)
            if (hashedPassword.StartsWith("$argon2"))
            {
                try
                {
                    // Parse the hash to extract salt and expected hash
                    // Format: $argon2id$v=19$m=19456,t=2,p=1$salt$hash
                    var parts = hashedPassword.Split('$');
                    if (parts.Length != 6) 
                    {
                        Console.WriteLine($"Invalid hash format: {parts.Length} parts");
                        return false;
                    }
                    
                    var saltBase64 = AddBase64Padding(parts[4]);
                    var expectedHashBase64 = AddBase64Padding(parts[5]);
                    
                    var salt = Convert.FromBase64String(saltBase64);
                    var expectedHash = Convert.FromBase64String(expectedHashBase64);
                    
                    // Use Argon2 library's built-in verification with matching parameters
                    var passwordBytes = Encoding.UTF8.GetBytes(password + pepper);
                    
                    using var argon2 = new Argon2id(passwordBytes);
                    argon2.Salt = salt;
                    argon2.DegreeOfParallelism = 1;
                    argon2.Iterations = 2;
                    argon2.MemorySize = 19456;

                    var hash = await argon2.GetBytesAsync(32);
                    
                    return CryptographicOperations.FixedTimeEquals(hash, expectedHash);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Password verification error: {ex.Message}");
                    return false;
                }
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
