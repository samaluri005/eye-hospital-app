using System;
using System.Text;
using System.Security.Cryptography;
using Konscious.Security.Cryptography;

var password = "Sam@#$0606";
var pepper = Environment.GetEnvironmentVariable("ARGON2_PEPPER") ?? "";
var storedHash = "$argon2id$v=19$m=19456,t=2,p=1$WNUt+IYzLgw7MH2Fax8xow$plvWKbRKu5kMm8HES7BgQtncyItDbY7gaiNm71fUPZ4";

Console.WriteLine($"Password: {password}");
Console.WriteLine($"Pepper exists: {!string.IsNullOrEmpty(pepper)}");
Console.WriteLine($"Pepper length: {pepper.Length}");
Console.WriteLine($"Stored hash: {storedHash}");

// Parse the hash
var parts = storedHash.Split('$');
Console.WriteLine($"Hash parts count: {parts.Length}");

if (parts.Length == 6) {
    var saltBase64 = parts[4];
    var expectedHashBase64 = parts[5];
    
    // Add padding
    var AddPadding = (string base64) => {
        switch (base64.Length % 4) {
            case 2: return base64 + "==";
            case 3: return base64 + "=";
            default: return base64;
        }
    };
    
    saltBase64 = AddPadding(saltBase64);
    expectedHashBase64 = AddPadding(expectedHashBase64);
    
    var salt = Convert.FromBase64String(saltBase64);
    var expectedHash = Convert.FromBase64String(expectedHashBase64);
    
    Console.WriteLine($"Salt length: {salt.Length}");
    Console.WriteLine($"Expected hash length: {expectedHash.Length}");
    
    // Hash with password + pepper
    var passwordBytes = Encoding.UTF8.GetBytes(password + pepper);
    
    using var argon2 = new Argon2id(passwordBytes);
    argon2.Salt = salt;
    argon2.DegreeOfParallelism = 1;
    argon2.Iterations = 2;
    argon2.MemorySize = 19456;
    
    var hash = argon2.GetBytesAsync(32).Result;
    
    Console.WriteLine($"Computed hash length: {hash.Length}");
    Console.WriteLine($"Hashes match: {CryptographicOperations.FixedTimeEquals(hash, expectedHash)}");
    
    Console.WriteLine($"\nExpected hash (hex): {BitConverter.ToString(expectedHash).Replace("-", "")}");
    Console.WriteLine($"Computed hash (hex): {BitConverter.ToString(hash).Replace("-", "")}");
}
