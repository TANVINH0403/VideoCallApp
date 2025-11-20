using Microsoft.AspNetCore.SignalR;
using System.Text;
using VideoCall.Application.Interfaces;
using VideoCall.Domain.Entities;

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
            if (string.IsNullOrEmpty(token))
            {
                Context.Abort();
                return;
            }

            try
            {
                var userIdString = Encoding.UTF8.GetString(Convert.FromBase64String(token));
                var currentUser = _userService.GetAllUsers().FirstOrDefault(u => u.Id == userIdString);

                if (currentUser == null)
                {
                    Context.Abort();
                    return;
                }

                await _userService.SetOnlineAsync(currentUser.Id.ToString(), Context.ConnectionId);
                var friends = await _userService.GetOnlineFriendsAsync(currentUser.Id.ToString());
                await Clients.Caller.SendAsync("LoadFriends",
                    friends.Select(f => new { f.Id, f.Name, f.IsOnline, f.ConnectionId }));
                await Clients.Others.SendAsync("FriendOnline", Context.ConnectionId, currentUser.Name);
            }
            catch(Exception ex)
            {
                Console.WriteLine($"Error in OnConnectedAsync: {ex.Message}");
                Context.Abort();
                return ;
            }

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

        public async Task CallFriend(string targetId)
        {
            var caller = _userService.GetByConnectionId(Context.ConnectionId);
            if (caller != null)
            {
                Console.WriteLine($"[DEBUG] Caller ({caller.Name}) is trying to call ConnectionId: {targetId}");

                // Gửi tín hiệu gọi tới người nhận (targetId)
                await Clients.Client(targetId).SendAsync("IncomingCall", Context.ConnectionId, caller.Name);

                // Thêm log để biết tín hiệu đã được gửi đi
                Console.WriteLine($"[DEBUG] Sent IncomingCall to {targetId}");
            }
            else
            {
                Console.WriteLine($"[ERROR] Caller not found for ConnectionId: {Context.ConnectionId}");
            }
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
                if(user.ConnectionId != null)
                {
                    await RefreshFriends(Context.ConnectionId);
                }
                var requesterUser = _userService.GetAllUsers().FirstOrDefault(u => u.Id == requesterId);
                if (requesterUser != null && requesterUser.ConnectionId != null)
                {
                    await RefreshFriends(requesterUser.ConnectionId);
                }
            }
        }

        private async Task RefreshFriends(string id)
        {
            var user = _userService.GetByConnectionId(id);
            if (user != null)
            {
                var friends = await _userService.GetOnlineFriendsAsync(user.Id);
                await Clients.Client(id).SendAsync("LoadFriends", friends.Select(f => new { f.Id, f.Name, f.IsOnline }));
            }
        }
    }
}