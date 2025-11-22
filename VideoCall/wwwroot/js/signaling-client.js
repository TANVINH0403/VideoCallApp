let connection = null;
let localStream = null;
let remoteStream = null;
let peerConnection = null;
let currentTargetConnectionId = null;
let currentTargetName = null;

// DOM Elements cho giao diện mới
const friendListEl = document.getElementById("friendList");
const welcomeScreen = document.getElementById("welcomeScreen");
const chatInterface = document.getElementById("chatInterface");
const chatNameEl = document.getElementById("chatName");
const chatAvatarEl = document.getElementById("chatAvatar");
const btnStartVideoCall = document.getElementById("btnStartVideoCall");

// DOM Elements cho Modal Gọi
const callModal = document.getElementById("callModal");
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const hangupBtn = document.getElementById("hangupBtn");

// Cấu hình ICE Servers
const iceServers = {
    iceServers: [
        { urls: "stun:stun.relay.metered.ca:80" },
        {
            urls: "turn:global.relay.metered.ca:80",
            username: "b0f9e65ea7bd51cba7566fd5",
            credential: "gA9dO40qYeKAZxAU",
        },
        {
            urls: "turns:global.relay.metered.ca:443?transport=tcp",
            username: "b0f9e65ea7bd51cba7566fd5",
            credential: "gA9dO40qYeKAZxAU",
        },
    ],
};

async function startSignalR() {
    const token = localStorage.getItem("authToken");
    if (!token) {
        window.location.href = "/login.html";
        return;
    }

    connection = new signalR.HubConnectionBuilder()
        .withUrl(`/hubs?token=${token}`)
        .withAutomaticReconnect()
        .build();

    // --- XỬ LÝ SỰ KIỆN SIGNALR ---
    connection.on("LoadFriends", renderFriends);

    connection.on("FriendOnline", (connectionId, name) => {
        console.log(`${name} đã online.`);
        // Tải lại trang để cập nhật danh sách (đơn giản hóa)
        location.reload();
    });

    connection.on("FriendOffline", (userId) => {
        console.log(`User ${userId} đã offline.`);
        location.reload();
    });

    // Xử lý cuộc gọi đến
    connection.on("IncomingCall", async (callerConnectionId, callerName) => {
        if (peerConnection) {
            // Đang bận thì từ chối
            await connection.invoke("RejectCall", callerConnectionId);
            return;
        }

        // Hiển thị thông báo xác nhận
        const accept = confirm(`📞 ${callerName} đang gọi video cho bạn!\nChấp nhận?`);
        if (accept) {
            currentTargetConnectionId = callerConnectionId;
            currentTargetName = callerName;

            // Mở Modal Gọi
            showCallModal();

            // 1. Báo cho người gọi biết mình đã nhận
            await connection.invoke("AcceptCall", callerConnectionId);

            // 2. Khởi tạo WebRTC (Người nhận: isCaller = false)
            await startCall(callerConnectionId, false);
        } else {
            await connection.invoke("RejectCall", callerConnectionId);
        }
    });

    connection.on("CallAccepted", async () => {
        console.log("Đối phương đã nhận cuộc gọi!");
        // Người gọi: isCaller = true
        await startCall(currentTargetConnectionId, true);
    });

    connection.on("CallRejected", () => {
        alert("Người dùng bận hoặc từ chối cuộc gọi.");
        hideCallModal();
    });

    connection.on("ReceiveOffer", async (callerId, sdp) => {
        if (!peerConnection) return;
        await peerConnection.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: sdp }));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        await connection.invoke("SendAnswer", callerId, answer.sdp);
    });

    connection.on("ReceiveAnswer", async (sdp) => {
        if (!peerConnection) return;
        await peerConnection.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: sdp }));
    });

    connection.on("ReceiveIce", async (candidate) => {
        if (!peerConnection || !candidate) return;
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
            console.error('Error adding received ICE candidate:', e);
        }
    });

    try {
        await connection.start();
        console.log("SignalR Connected!");
    } catch (err) {
        console.error(err);
    }
}

// === UI LOGIC: RENDER DANH SÁCH BẠN ===
function renderFriends(friends) {
    friendListEl.innerHTML = "";

    if (!friends || friends.length === 0) {
        friendListEl.innerHTML = "<li style='text-align:center; color:#999; margin-top:20px'>Chưa có bạn bè online</li>";
        return;
    }

    friends.forEach((f) => {
        const li = document.createElement("li");
        li.className = "friend-item";

        // Lấy chữ cái đầu của tên làm Avatar
        const avatarLetter = f.name ? f.name.charAt(0).toUpperCase() : "?";

        li.innerHTML = `
            <div class="avatar-wrapper">
                <div class="avatar">${avatarLetter}</div>
                <div class="status-dot ${f.isOnline ? 'online' : ''}"></div>
            </div>
            <div class="friend-info">
                <h4>${f.name}</h4>
                <p>${f.isOnline ? 'Đang hoạt động' : 'Offline'}</p>
            </div>
        `;

        li.addEventListener("click", () => {
            selectFriend(f);
            // Highlight item được chọn
            document.querySelectorAll('.friend-item').forEach(item => item.classList.remove('active'));
            li.classList.add('active');
        });

        friendListEl.appendChild(li);
    });
}

// === CHỌN NGƯỜI ĐỂ CHAT/GỌI ===
function selectFriend(friend) {
    currentTargetConnectionId = friend.connectionId;
    currentTargetName = friend.name;

    // Ẩn màn hình chào, hiện giao diện chat
    welcomeScreen.style.display = "none";
    chatInterface.classList.add("active");

    // Hiện flex để đảm bảo layout đúng
    chatInterface.style.display = "flex";

    // Cập nhật thông tin Header
    chatNameEl.textContent = friend.name;
    chatAvatarEl.textContent = friend.name.charAt(0).toUpperCase();

    // Gán sự kiện cho nút Gọi Video
    // Lưu ý: Xóa sự kiện cũ trước khi gán mới để tránh gọi nhiều lần (đơn giản hóa bằng cách gán onclick)
    btnStartVideoCall.onclick = () => initiateCall(friend.connectionId, friend.name);
}

// === BẮT ĐẦU CUỘC GỌI (Người gọi bấm nút) ===
async function initiateCall(targetId, targetName) {
    if (!targetId) {
        alert("Người dùng này hiện không online.");
        return;
    }

    showCallModal(); // Hiện giao diện gọi ngay lập tức
    console.log(`Đang gọi cho ${targetName}...`);

    // Gửi tín hiệu gọi
    await connection.invoke("CallFriend", targetId);
}

// === WEBRTC CORE ===
async function startCall(targetConnectionId, isCaller) {
    try {
        await getLocalStream();
    } catch (err) {
        console.error("Không lấy được Camera/Mic:", err);
        alert("Lỗi: Không truy cập được Camera/Mic. Kiểm tra quyền truy cập.");
        hideCallModal();
        return;
    }

    peerConnection = new RTCPeerConnection(iceServers);

    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = (event) => {
        remoteStream = event.streams[0];
        remoteVideo.srcObject = remoteStream;
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            connection.invoke("SendIce", targetConnectionId, event.candidate);
        }
    };

    if (isCaller) {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        await connection.invoke("SendOffer", targetConnectionId, offer.sdp);
    }
}

// === QUẢN LÝ MODAL & STREAM ===
function showCallModal() {
    callModal.classList.add("active");
    callModal.style.display = "flex"; // Đảm bảo hiện flex
}

function hideCallModal() {
    callModal.classList.remove("active");
    callModal.style.display = "none";
    hangUpLogic();
}

function hangUpLogic() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    remoteVideo.srcObject = null;
    localVideo.srcObject = null;
}

async function getLocalStream() {
    localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
    });
    localVideo.srcObject = localStream;
}

// Nút Ngắt máy
if (hangupBtn) {
    hangupBtn.addEventListener("click", () => {
        // Tắt phía mình
        hideCallModal();
        // Có thể gửi thêm sự kiện báo đối phương tắt
    });
}

document.addEventListener("DOMContentLoaded", () => {
    startSignalR();
});