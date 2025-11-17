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
                
                // SỬA ĐỔI: Thêm ConnectionId để client có thể gọi được
                await Clients.Caller.SendAsync("LoadFriends", friends.Select(f => new { f.Id, f.Name, f.IsOnline, f.ConnectionId })); 
                
                await Clients.Others.SendAsync("FriendOnline", Context.ConnectionId, user.Name);
            }
            catch { Context.Abort(); }

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? ex)
        {
            await _userService.SetOfflineAsync(Context.ConnectionId);
            await Clients.Others.SendAsync("FriendOffline", Context.ConnectionId);
            await base.OnDisconnectedAsync(ex);
        }

        // SỬA ĐỔI QUAN TRỌNG: Đảm bảo kiểm tra tình bạn bằng UserId
        public async Task CallFriend(string targetConnectionId) 
        {
            var caller = _userService.GetByConnectionId(Context.ConnectionId);
            // Tìm UserId của người nhận từ ConnectionId
            var targetUser = _userService.GetByConnectionId(targetConnectionId); 

            // Kiểm tra: Cả hai tồn tại VÀ là bạn bè (sử dụng UserId)
            if (caller != null && targetUser != null && 
                await _friendshipService.AreFriendsAsync(caller.Id, targetUser.Id))
            {
                // Gửi tín hiệu gọi đến ConnectionId của người nhận
                await Clients.Client(targetConnectionId).SendAsync("IncomingCall", Context.ConnectionId, caller.Name);
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
                // SỬA ĐỔI: Thêm ConnectionId để client có thể gọi được
                await Clients.Client(id).SendAsync("LoadFriends", friends.Select(f => new { f.Id, f.Name, f.IsOnline, f.ConnectionId }));
            }
        }
    }
}