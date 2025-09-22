using System;
using System.Security.Cryptography;
using System.Text;

namespace AuthService.Services
{
    public static class OtpHelper
    {
        public static string GenerateOtp()
        {
            int n = RandomNumberGenerator.GetInt32(0, 1_000_000);
            return n.ToString("D6");
        }

        public static string ComputeHmac(string secret, string otp, string nonce)
        {
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
            var data = Encoding.UTF8.GetBytes(otp + nonce);
            var hash = hmac.ComputeHash(data);
            return BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
        }

        public static string NewNonce() => BitConverter.ToString(RandomNumberGenerator.GetBytes(12)).Replace("-", "").ToLowerInvariant();
    }
}