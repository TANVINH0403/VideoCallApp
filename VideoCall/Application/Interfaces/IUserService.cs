using VideoCall.Web.Domain.Entities;

namespace VideoCall.Application.Interfaces
{
    public interface IUserService
    {
        Task<User?> LoginAsync(string name, string password);
        Task SetOnlineAsync(string connectionId, User user);
        Task SetOfflineAsync(string connectionId);
        Task<List<User>> GetOnlineFriendsAsync(string currentUserId);
        User? GetByConnectionId(string connectionId);
        IReadOnlyList<User> GetAllUsers();
    }
}
