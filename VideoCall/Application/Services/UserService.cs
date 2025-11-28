using VideoCall.Application.Interfaces;
using VideoCall.Domain.Entities;

namespace VideoCall.Application.Services
{
    public class UserService : IUserService
    {
        private readonly IRepository<User> userRepo;
        // Dictionary chỉ dùng để map ConnectionId <-> User khi Online
        private readonly Dictionary<string, User> _onlineUsers = new();

        public UserService(IRepository<User> userRepo)
        {
            this.userRepo = userRepo;
        }


        // Đăng nhập người dùng
        public Task<User?> LoginAsync(string name, string password)
        {
            var user = this.userRepo.GetAll().FirstOrDefault(u => u.Name == name);
            return Task.FromResult(
                user != null && BCrypt.Net.BCrypt.Verify(password, user.PasswordHash)
                    ? user
                    : null
            );
        }

        // Đánh dấu online và lưu connectionId
        public Task SetOnlineAsync(string userId, string connectionId)
        {
            var user = userRepo.GetAll().FirstOrDefault(u => u.Id == userId);
            if (user == null) return Task.CompletedTask;

            user.SetOnline(connectionId);
            _onlineUsers[connectionId] = user; // Lưu vào bộ nhớ tạm online
            return Task.CompletedTask;
        }

        // Xóa khỏi danh sách online
        public Task<User?> SetOfflineAsync(string connectionId)
        {
            if (_onlineUsers.Remove(connectionId, out var user))
            {
                user.SetOffline();
                return Task.FromResult<User?>(user);
            }
            return Task.FromResult<User?>(null);
        }

        // --- LẤY TẤT CẢ USER + TRẠNG THÁI ---
        public Task<List<User>> GetAllUsersWithStatusAsync(string currentUserId)
        {
            var allUsers = userRepo.GetAll()
                .Where(u => u.Id != currentUserId) // Trừ bản thân mình ra
                .Select(u => {
                    // Kiểm tra xem user này có đang trong Dictionary online không
                    var isOnline = _onlineUsers.Values.Any(onlineU => onlineU.Id == u.Id);
                    // Nếu online, cập nhật ConnectionId mới nhất
                    if (isOnline)
                    {
                        var onlineUser = _onlineUsers.Values.First(ou => ou.Id == u.Id);
                        u.SetOnline(onlineUser.ConnectionId!);
                    }
                    else
                    {
                        u.SetOffline();
                    }
                    return u;
                })
                .ToList();

            return Task.FromResult(allUsers);
        }

        // Các hàm cũ giữ nguyên hoặc không dùng tới, nhưng để interface không lỗi ta cứ để đó
        public Task<List<User>> GetOnlineFriendsAsync(string currentUserId) => Task.FromResult(new List<User>());
        public User? GetByConnectionId(string connectionId) => _onlineUsers.GetValueOrDefault(connectionId);
        public User? GetOnlineUserById(string userId) => _onlineUsers.Values.FirstOrDefault(u => u.Id == userId);
        public IReadOnlyList<User> GetAllUsers() => userRepo.GetAll();
    }
}