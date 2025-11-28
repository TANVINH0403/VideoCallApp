using Microsoft.AspNetCore.SignalR;
using System.Text;
using VideoCall.Application.Interfaces;
using VideoCall.Domain.Entities;

namespace VideoCall.Infrastructure.SignalR
{
    public class VideoCallHub : Hub
    {
        private readonly IUserService _userService;

        private static List<Message> _messageStore = [];

        public VideoCallHub(IUserService userService)
        {
            _userService = userService;
        }

        public override async Task OnConnectedAsync()
        {
            var token = Context.GetHttpContext()?.Request.Query["token"].FirstOrDefault();
            if (string.IsNullOrEmpty(token)) { Context.Abort(); return; } 

            var userIdString = Encoding.UTF8.GetString(Convert.FromBase64String(token));

            await _userService.SetOnlineAsync(userIdString, Context.ConnectionId);

            var allUsers = await _userService.GetAllUsersWithStatusAsync(userIdString);

            await Clients.Caller.SendAsync("LoadFriends",
                allUsers.Select(f => new { f.Id, f.Name, f.IsOnline, f.ConnectionId }));

            var user = _userService.GetAllUsers().FirstOrDefault(u => u.Id == userIdString);
            await Clients.Others.SendAsync("UserStatusChanged", userIdString, true, Context.ConnectionId);

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var user = await _userService.SetOfflineAsync(Context.ConnectionId);
            if (user != null)
            {
                await Clients.Others.SendAsync("UserStatusChanged", user.Id, false, null);
            }
            await base.OnDisconnectedAsync(exception);
        }

        // --- CHỨC NĂNG CHAT ---
        public async Task SendMessage(string targetId, string content)
        {
            var sender = _userService.GetByConnectionId(Context.ConnectionId);
            if (sender == null) return;

            var msg = new Message { SenderId = sender.Id, ReceiverId = targetId, Content = content };
            _messageStore.Add(msg);

            var targetUser = _userService.GetOnlineUserById(targetId);

            await Clients.Caller.SendAsync("ReceiveMessage", sender.Id, content);

            if (targetUser != null && targetUser.ConnectionId != null)
            {
                await Clients.Client(targetUser.ConnectionId).SendAsync("ReceiveMessage", sender.Id, content);
            }
        }

        public async Task GetChatHistory(string targetId)
        {
            var sender = _userService.GetByConnectionId(Context.ConnectionId);
            if (sender == null) return;

            var history = _messageStore
                .Where(m => (m.SenderId == sender.Id && m.ReceiverId == targetId) ||
                            (m.SenderId == targetId && m.ReceiverId == sender.Id))
                .OrderBy(m => m.Timestamp)
                .Select(m => new { m.SenderId, m.Content })
                .ToList();

            await Clients.Caller.SendAsync("LoadChatHistory", history);
        }


        //Bắt đầu cuộc gọi
        public async Task CallFriend(string targetId)
        {
            var caller = _userService.GetByConnectionId(Context.ConnectionId);

            if (string.IsNullOrEmpty(targetId)) return;

            await Clients.Client(targetId).SendAsync("IncomingCall  ", Context.ConnectionId, caller?.Name);
        }

        //Kết thúc cuộc gọi 
        public async Task EndCall(string targetId)
        {
            await Clients.Client(targetId).SendAsync("CallEnded");
        }

        //Chấp nhận cuộc gọi
        public async Task AcceptCall(string callerId) => await Clients.Client(callerId).SendAsync("CallAccepted", Context.ConnectionId);

        //Từ chối cuộc gọi
        public async Task RejectCall(string callerId) => await Clients.Client(callerId).SendAsync("CallRejected");

        //Gửi đề nghị kết nối
        public async Task SendOffer(string targetId, string sdp) => await Clients.Client(targetId).SendAsync("ReceiveOffer", Context.ConnectionId, sdp);

        //gửi phản hồi kết nối 
        public async Task SendAnswer(string targetId, string sdp) => await Clients.Client(targetId).SendAsync("ReceiveAnswer", sdp);

        //Gửi thông tin địa chỉ mạng
        public async Task SendIce(string targetId, object candidate) => await Clients.Client(targetId).SendAsync("ReceiveIce", candidate);
    }
}