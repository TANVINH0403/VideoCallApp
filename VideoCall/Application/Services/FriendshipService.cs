using VideoCall.Application.Interfaces;
using VideoCall.Domain.Entities;
using VideoCall.Web.Domain.Entities;

namespace VideoCall.Application.Services
{
    public class FriendshipService : IFriendshipService
    {
        private readonly IRepository<Friendship> repo;

        public FriendshipService(IRepository<Friendship> repo) => this.repo = repo;

        public async Task<bool> AreFriendsAsync(string user1Id, string user2Id)
        {
            var (a, b) = user1Id.CompareTo(user2Id) < 0 ? (user1Id, user2Id) : (user2Id, user1Id);
            return repo.GetAll().Any(f => f.User1Id == a && f.User2Id == b);
        }

        public async Task AddFriendshipAsync(string user1Id, string user2Id)
        {
            var (a, b) = user1Id.CompareTo(user2Id) < 0 ? (user1Id, user2Id) : (user2Id, user1Id);
            if (!await AreFriendsAsync(a, b))
            {
                var list = repo as List<Friendship>;
                list?.Add(new Friendship { User1Id = a, User2Id = b });
            }
        }
    }
}
