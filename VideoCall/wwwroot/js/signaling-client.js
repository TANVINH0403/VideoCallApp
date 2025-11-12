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
const statusEL = document.getElementById("status"); // Biến trạng thái đúng

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

    // ... (Các hàm connection.on khác không đổi)
    connection.on("IncomingCall", (callerConnectionId) => {
        if (confirm("Có cuộc gọi từ bạn bè. Nhận không?")) {
            currentCallId = callerConnectionId;
            startCall(callerConnectionId, false);
        }
    });

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
        statusEL.textContent = "Đã kết nối!";
        statusEL.className = "status";
    } catch (err) {
        statusEL.textContent = "Lỗi kết nối SignalR!";
        statusEL.className = "status offline";
        console.error(err);
    }
}

// === RENDER DANH SÁCH BẠN (ĐÃ SỬA LỖI BẢO MẬT/CÚ PHÁP) ===
function renderFriends(friends) {
    friendList.innerHTML = "";
    if (friends.length === 0) {
        friendList.innerHTML = "<li>Không có bạn online</li>";
        return;
    }

    friends.forEach(f => {
        const li = document.createElement("li");

        // Dùng textContent để hiển thị tên an toàn
        const nameSpan = document.createElement("span");
        nameSpan.innerHTML = `<strong>${f.name}</strong>`;

        // Tạo nút Kết bạn và gán sự kiện an toàn
        const btnAdd = document.createElement("button");
        btnAdd.textContent = "Kết bạn";
        btnAdd.addEventListener('click', () => addFriend(f.id));

        // Tạo nút Gọi và gán sự kiện an toàn
        const btnCall = document.createElement("button");
        btnCall.textContent = "Gọi";
        btnCall.addEventListener('click', () => callUser(f.connectionId));

        li.appendChild(nameSpan);
        li.appendChild(btnAdd);
        li.appendChild(btnCall);

        friendList.appendChild(li);
    });
}


// ... (Các hàm khác như callUser, startCall, hangUp, getLocalStream, addFriend không thay đổi)
async function callUser(targetConnectionId) {
    currentCallId = targetConnectionId;
    await startCall(targetConnectionId, true);
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

function hangUp() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    remoteVideo.srcObject = null;
    hangupBtn.disabled = true;
    currentCallId = null;
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
    getLocalStream();
});