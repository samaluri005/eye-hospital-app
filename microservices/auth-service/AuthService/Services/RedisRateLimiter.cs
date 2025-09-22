using StackExchange.Redis;
using System;
using System.Threading.Tasks;

namespace AuthService.Services
{
    public class RedisRateLimiter : IDisposable
    {
        private readonly ConnectionMultiplexer _mux;
        private readonly IDatabase _db;

        public RedisRateLimiter(string conn)
        {
            _mux = ConnectionMultiplexer.Connect(conn);
            _db = _mux.GetDatabase();
        }

        public async Task<long> IncrementAsync(string key, int windowSeconds)
        {
            var v = await _db.StringIncrementAsync(key);
            if (v == 1) await _db.KeyExpireAsync(key, TimeSpan.FromSeconds(windowSeconds));
            return v;
        }

        public void Dispose() => _mux?.Dispose();
    }
}