using VideoCall.Web.Domain.Entities;

namespace VideoCall.Application.Interfaces
{
    public interface IUserService
    {
        Task<User?> LoginAsync(string name, string password);
        Task SetOnlineAsync(string connectionId, User user);
        Task<User?> SetOfflineAsync(string connectionId); // Sửa đổi
        Task<List<User>> GetOnlineFriendsAsync(string currentUserId);
        User? GetByConnectionId(string connectionId);
        User? GetOnlineUserById(string userId); // Thêm mới
        IReadOnlyList<User> GetAllUsers();
    }
}