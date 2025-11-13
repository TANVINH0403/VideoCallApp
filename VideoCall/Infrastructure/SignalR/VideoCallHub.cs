using Microsoft.AspNetCore.SignalR;
using System.Text;
using VideoCall.Application.Interfaces;

namespace VideoCall.Infrastructure.SignalR
{
    public class VideoCallHub : Hub
    {
        private readonly IUserService _userService;
        private readonly IFriendshipService _friendshipService;

        public VideoCallHub(IUserService userService, IFriendshipService friendshipService)
        {
            _userService = userService;
            _friendshipService = friendshipService;
        }

        public override async Task OnConnectedAsync()
        {
            var token = Context.GetHttpContext()?.Request.Query["token"].FirstOrDefault();
            if (string.IsNullOrEmpty(token)) { Context.Abort(); return; }

            try
            {
                var userId = Encoding.UTF8.GetString(Convert.FromBase64String(token));
                var user = _userService.GetAllUsers().FirstOrDefault(u => u.Id == userId);
                if (user == null) { Context.Abort(); return; }

                await _userService.SetOnlineAsync(Context.ConnectionId, user);

                var friends = await _userService.GetOnlineFriendsAsync(user.Id);
                await Clients.Caller.SendAsync("LoadFriends", friends.Select(f => new { f.Id, f.Name }));

                await Clients.Others.SendAsync("FriendOnline", new { user.Id, user.Name });
            }
            catch { Context.Abort(); }

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? ex)
        {
            var user = await _userService.SetOfflineAsync(Context.ConnectionId);
            if (user != null)
            {
                await Clients.Others.SendAsync("FriendOffline", user.Id);
            }
            await base.OnDisconnectedAsync(ex);
        }

        public async Task CallFriend(string targetUserId)
        {
            var caller = _userService.GetByConnectionId(Context.ConnectionId);
            //  Tìm người dùng trong danh sách ONLINE
            var targetUser = _userService.GetOnlineUserById(targetUserId);

            if (caller == null || targetUser == null)
            {
                return;
            }

            await Clients.Client(targetUser.ConnectionId).SendAsync("IncomingCall", Context.ConnectionId, caller.Name);
        }

        public async Task AcceptCall(string callerId) => await Clients.Client(callerId).SendAsync("CallAccepted", Context.ConnectionId);
        public async Task RejectCall(string callerId) => await Clients.Client(callerId).SendAsync("CallRejected");

        public async Task SendOffer(string targetId, string sdp) => await Clients.Client(targetId).SendAsync("ReceiveOffer", Context.ConnectionId, sdp);
        public async Task SendAnswer(string targetId, string sdp) => await Clients.Client(targetId).SendAsync("ReceiveAnswer", sdp);
        public async Task SendIce(string targetId, object candidate)
        {
            await Clients.Client(targetId).SendAsync("ReceiveIce", candidate);
        }

        public async Task SendFriendRequest(string targetId)
        {
            var sender = _userService.GetByConnectionId(Context.ConnectionId);
            if (sender != null)
                await Clients.Client(targetId).SendAsync("ReceiveFriendRequest", Context.ConnectionId, sender.Name);
        }

        public async Task AcceptFriendRequest(string requesterId)
        {
            var user = _userService.GetByConnectionId(Context.ConnectionId);
            if (user != null)
            {
                await _friendshipService.AddFriendshipAsync(user.Id, requesterId);
                await RefreshFriends(Context.ConnectionId);
                await RefreshFriends(requesterId);
            }
        }

        private async Task RefreshFriends(string id)
        {
            var user = _userService.GetByConnectionId(id);
            if (user != null)
            {
                var friends = await _userService.GetOnlineFriendsAsync(user.Id);
                await Clients.Client(id).SendAsync("LoadFriends", friends.Select(f => new { f.Id, f.Name }));
            }
        }
    }
}