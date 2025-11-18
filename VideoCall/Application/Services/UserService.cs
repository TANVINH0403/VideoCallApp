using BCrypt.Net;
using System.Collections.Generic;
using VideoCall.Application.Interfaces;
using VideoCall.Domain.Entities;

namespace VideoCall.Application.Services
{
    public class UserService : IUserService
    {
        private readonly IRepository<User> userRepo;
        private readonly Dictionary<string, User> _onlineUsers = new();

        public UserService(IRepository<User> userRepo)
        {
            // 3. GÁN THAM SỐ DI VÀO FIELD NỘI BỘ
            this.userRepo = userRepo;
        }

        public Task<User?> LoginAsync(string name, string password)
        {
            var user = this.userRepo.GetAll().FirstOrDefault(u => u.Name == name);
            return Task.FromResult(
                user != null && BCrypt.Net.BCrypt.Verify(password, user.PasswordHash)
                    ? user
                    : null
            );
        }

        public Task SetOnlineAsync(string connectionId, User user)
        {
            user.SetOnline(connectionId);
            _onlineUsers[connectionId] = user;
            return Task.CompletedTask;
        }

        public Task<User?> SetOfflineAsync(string connectionId)
        {
            if (_onlineUsers.Remove(connectionId, out var user))
            {
                user.SetOffline();
                return Task.FromResult<User?>(user);
            }
            return Task.FromResult<User?>(null);
        }

        public Task<List<User>> GetOnlineFriendsAsync(string currentUserId)
        {
            var friends = _onlineUsers.Values
                .Where(u => u.Id != currentUserId)
                .ToList();
            return Task.FromResult(friends);
        }

        public User? GetByConnectionId(string connectionId)
            => _onlineUsers.GetValueOrDefault(connectionId);

        // Thêm mới
        public User? GetOnlineUserById(string userId)
            => _onlineUsers.Values.FirstOrDefault(u => u.Id == userId);

        public IReadOnlyList<User> GetAllUsers()
            => userRepo.GetAll();
    }
}
