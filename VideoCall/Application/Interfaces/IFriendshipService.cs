using VideoCall.Web.Domain.Entities;

namespace VideoCall.Application.Interfaces
{
    public interface IFriendshipService
    {
        Task<bool> AreFriendsAsync(string user1Id, string user2Id);
        Task AddFriendshipAsync(string user1Id, string user2Id);
    }
}
