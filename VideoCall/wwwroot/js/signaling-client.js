// wwwroot/js/signaling-client.js
let connection = null;
let localStream = null;
let remoteStream = null;
let peerConnection = null;
let currentCallId = null;

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const hangupBtn = document.getElementById("hangupBtn");
const friendList = document.getElementById("friendList");
const status = document.getElementById("status");

// Cấu hình STUN (dùng Google miễn phí)
const iceServers = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
    ]
};

// === KHỞI TẠO SIGNALR ===
async function startSignalR() {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    connection = new signalR.HubConnectionBuilder()
        .withUrl(`/hubs?token=${token}`)
        .withAutomaticReconnect()
        .build();

    // Nhận danh sách bạn bè
    connection.on("LoadFriends", (friends) => {
        renderFriends(friends);
    });

    // Nhận cuộc gọi đến
    connection.on("IncomingCall", (callerConnectionId) => {
        if (confirm("Có cuộc gọi từ bạn bè. Nhận không?")) {
            currentCallId = callerConnectionId;
            startCall(callerConnectionId, false);
        }
    });

    // Nhận tín hiệu WebRTC
    connection.on("ReceiveSignal", async (signal, fromConnectionId) => {
        if (!peerConnection) return;

        const desc = JSON.parse(signal);
        if (desc.type === "offer") {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(desc));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            await connection.invoke("SendSignal", JSON.stringify(answer), fromConnectionId);
        } else if (desc.type === "answer") {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(desc));
        } else if (desc.candidate) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(desc.candidate));
        }
    });
    
    // Bắt đầu kết nối
    try {
        await connection.start();
        statusEl.textContent = "Đã kết nối!"; // ĐÃ SỬA
        statusEl.className = "status";
    } catch (err) {
        statusEl.textContent = "Lỗi kết nối SignalR!";
        statusEl.className = "status offline";
        console.error(err);
    }
}

// === RENDER DANH SÁCH BẠN ===
function renderFriends(friends) {
    friendList.innerHTML = "";
    if (friends.length === 0) {
        friendList.innerHTML = "<li>Không có bạn online</li>";
        return;
    }

    friends.forEach(f => {
        const li = document.createElement("li");
        li.innerHTML = `
      <span><strong>${f.name}</strong></span>
      <button onclick="addFriend('${f.id}')">Kết bạn</button>
      <button onclick="callUser('${f.connectionId}')">Gọi</button>
    `;
        friendList.appendChild(li);
    });
}


// === GỌI NGƯỜI DÙNG ===
async function callUser(targetConnectionId) {
    currentCallId = targetConnectionId;
    await startCall(targetConnectionId, true);
}

// === BẮT ĐẦU CUỘC GỌI ===
async function startCall(targetConnectionId, isCaller) {
    await getLocalStream();

    peerConnection = new RTCPeerConnection(iceServers);

    // Thêm track local
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    // Nhận track remote
    peerConnection.ontrack = (event) => {
        remoteStream = event.streams[0];
        remoteVideo.srcObject = remoteStream;
    };

    // Gửi ICE candidate
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            connection.invoke("SendSignal", JSON.stringify({ candidate: event.candidate }), targetConnectionId);
        }
    };

    if (isCaller) {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        await connection.invoke("SendSignal", JSON.stringify(offer), targetConnectionId);
    }

    hangupBtn.disabled = false;
    hangupBtn.onclick = hangUp;
}

// === NGẮT CUỘC GỌI ===
function hangUp() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    remoteVideo.srcObject = null;
    hangupBtn.disabled = true;
    currentCallId = null;
}

// === LẤY CAMERA + MIC ===
async function getLocalStream() {
    if (localStream) return;
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
    } catch (err) {
        alert("Không thể truy cập camera/mic: " + err.message);
    }
}

// === GỬI KẾT BẠN ===
async function addFriend(friendId) {
    try {
        await connection.invoke("AddFriend", friendId);
        alert("Đã gửi lời mời kết bạn!");
    } catch (err) {
        alert("Lỗi gửi kết bạn!");
    }
}

// === KHỞI ĐỘNG ===
document.addEventListener("DOMContentLoaded", () => {
    startSignalR();
    hangupBtn.disabled = true;
});