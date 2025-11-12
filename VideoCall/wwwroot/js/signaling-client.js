// wwwroot/js/signaling-client.js
let connection = null;
let localStream = null;
let remoteStream = null;
let peerConnection = null;
let currentTargetConnectionId = null;

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const hangupBtn = document.getElementById("hangupBtn");
const friendList = document.getElementById("friendList");
const statusEL = document.getElementById("status");

const iceServers = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
    ]
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

    // === CÁC HÀM NHẬN TÍN HIỆU TỪ SERVER ===

    connection.on("LoadFriends", (friends) => {
        renderFriends(friends);
    });

    // THÊM MỚI: Xử lý khi có bạn mới online
    connection.on("FriendOnline", (user) => {
        addFriendToList(user);
    });

    // THÊM MỚI: Xử lý khi có bạn offline
    connection.on("FriendOffline", (userId) => {
        removeFriendFromList(userId);
    });

    // (Các hàm nhận cuộc gọi giữ nguyên)
    connection.on("IncomingCall", (callerConnectionId, callerName) => {
        if (confirm(`${callerName} đang gọi. Bạn có muốn trả lời?`)) {
            currentTargetConnectionId = callerConnectionId;
            connection.invoke("AcceptCall", callerConnectionId);
            startCall(callerConnectionId, false);
        } else {
            connection.invoke("RejectCall", callerConnectionId);
        }
    });
    connection.on("CallAccepted", (receiverConnectionId) => {
        currentTargetConnectionId = receiverConnectionId;
        startCall(receiverConnectionId, true);
    });
    connection.on("CallRejected", () => {
        alert("Cuộc gọi bị từ chối.");
        currentTargetConnectionId = null;
    });
    connection.on("ReceiveOffer", async (fromConnectionId, sdp) => {
        currentTargetConnectionId = fromConnectionId;
        await startCall(fromConnectionId, false);
        await peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(sdp)));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        await connection.invoke("SendAnswer", fromConnectionId, JSON.stringify(answer));
    });
    connection.on("ReceiveAnswer", async (sdp) => {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(sdp)));
    });
    connection.on("ReceiveIce", async (candidate) => {
        if (peerConnection) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
    });

    // Bắt đầu kết nối
    try {
        await connection.start();
        statusEL.textContent = "Đã kết nối!";
        statusEL.className = "status";
    } catch (err) {
        statusEL.textContent = "Lỗi kết nối SignalR!";
        statusEL.className = "status offline";
        console.error(err);
    }
}

// === CÁC HÀM XỬ LÝ DANH SÁCH BẠN ===

function renderFriends(friends) {
    friendList.innerHTML = "";
    if (friends.length === 0) {
        friendList.innerHTML = "<li id='no-friends-msg'>Không có bạn online</li>";
        return;
    }
    friends.forEach(f => {
        addFriendToList(f);
    });
}

function addFriendToList(user) {
    const noFriendsMsg = document.getElementById("no-friends-msg");
    if (noFriendsMsg) {
        noFriendsMsg.remove();
    }

    const li = document.createElement("li");
    li.id = `user-${user.id}`;

    const nameSpan = document.createElement("span");
    nameSpan.innerHTML = `<strong>${user.name}</strong>`;

    nameSpan.style.cursor = "pointer";
    nameSpan.style.textDecoration = "underline";
    nameSpan.addEventListener('click', () => {
        callUser(user.id);
    });

    li.appendChild(nameSpan);
    friendList.appendChild(li);
}

function removeFriendFromList(userId) {
    const userElement = document.getElementById(`user-${userId}`);
    if (userElement) {
        userElement.remove();
    }
    if (friendList.children.length === 0) {
        friendList.innerHTML = "<li id='no-friends-msg'>Không có bạn online</li>";
    }
}

// === CÁC HÀM XỬ LÝ CUỘC GỌI ===

async function callUser(targetUserId) {
    await connection.invoke("CallFriend", targetUserId);
}

async function startCall(targetConnectionId, isCaller) {
    await getLocalStream();

    peerConnection = new RTCPeerConnection(iceServers);

    localStream.getTracks().forEach(track => {
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
        await connection.invoke("SendOffer", targetConnectionId, JSON.stringify(offer));
    }

    hangupBtn.disabled = false;
    hangupBtn.onclick = hangUp;
}

function hangUp() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    remoteVideo.srcObject = null;
    hangupBtn.disabled = true;
    currentTargetConnectionId = null;
}

async function getLocalStream() {
    if (localStream) return;
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
    } catch (err) {
        alert("Không thể truy cập camera/mic: " + err.message);
    }
}

async function addFriend(friendId) {
    try {
        await connection.invoke("SendFriendRequest", friendId);
        alert("Đã gửi lời mời kết bạn!");
    } catch (err) {
        // (Xử lý lỗi nếu cần)
    }
}

document.addEventListener("DOMContentLoaded", () => {
    startSignalR();
    hangupBtn.disabled = true;
});