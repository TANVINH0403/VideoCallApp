
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
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

async function startSignalR() {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    connection = new signalR.HubConnectionBuilder()
        .withUrl(`/hubs?token=${token}`)
        .withAutomaticReconnect()
        .build();

    // --- XỬ LÝ SỰ KIỆN SIGNALR ---

    connection.on("LoadFriends", renderFriends);

    connection.on("FriendOnline", (connectionId, name) => {
        const newFriend = {
            id: null, 
            name: name,
            isOnline: true,
            connectionId: connectionId 
        };

        addFriendToList(newFriend);
        console.log(`${name} đã online.`);
    });
    // Xử lý cuộc gọi đến (Tham số: callerConnectionId, callerName)
    connection.on("IncomingCall", async (callerConnectionId, callerName) => {
        if (peerConnection) {
            await connection.invoke("RejectCall", callerConnectionId);
            return;
        }

        if (confirm(`Có cuộc gọi từ ${callerName}. Nhận không?`)) {
            currentTargetConnectionId = callerConnectionId;

            // 1. Thông báo cho người gọi biết cuộc gọi đã được chấp nhận
            await connection.invoke("AcceptCall", callerConnectionId);

            // 2. Khởi tạo PeerConnection (là người nhận, isCaller = false)
            await startCall(callerConnectionId, false);
        } else {
            // 3. Gửi tín hiệu từ chối
            await connection.invoke("RejectCall", callerConnectionId);
        }
    });


    connection.on("ReceiveOffer", async (callerId, sdp) => {
        if (!peerConnection) return;

        await peerConnection.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: sdp }));

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        // Gửi Answer về người gọi (callerId)
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
        statusEL.textContent = "Đã kết nối!";
        statusEL.className = "status";
    } catch (err) {
        statusEL.textContent = "Lỗi kết nối SignalR!";
        statusEL.className = "status offline";
        console.error(err);
    }
}

// === RENDER DANH SÁCH BẠN ===
function renderFriends(friends) {
    friendList.innerHTML = "";
    if (friends.length === 0) {
        return;
    }

    friends.forEach((f) => {
        const li = document.createElement("li");
        const nameSpan = document.createElement("span");
        nameSpan.innerHTML = `<strong>${f.name}</strong>`;
        const btnCall = document.createElement("button");
        btnCall.textContent = "Gọi";
        btnCall.addEventListener("click", () => callUser(f.connectionId, f.name));

        li.appendChild(nameSpan);
        li.appendChild(btnCall);
        friendList.appendChild(li);
    });
}

// === KHỞI TẠO CUỘC GỌI ===
async function callUser(targetConnectionId, targetName) {
    currentTargetConnectionId = targetConnectionId;

    // 1. Gửi yêu cầu gọi lên Server (CallFriend)
    await connection.invoke("CallFriend", targetConnectionId);

    // 2. Khởi tạo PeerConnection (là người gọi, isCaller = true)
    await startCall(targetConnectionId, true);
}

// === WEB RTC CORE LOGIC ===
async function startCall(targetConnectionId, isCaller) {
    await getLocalStream();
    peerConnection = new RTCPeerConnection(iceServers);

    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = (event) => {
        remoteStream = event.streams[0];
        remoteVideo.srcObject = remoteStream;
    };

    // 1. Gửi ICE Candidate
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            // Gửi ICE Candidate bằng hàm SendIce
            connection.invoke(
                "SendIce",
                targetConnectionId, // targetId
                event.candidate     // candidate object
            );
        }
    };

    // 2. Gửi Offer
    if (isCaller) {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        // Gửi Offer bằng hàm SendOffer 
        await connection.invoke(
            "SendOffer",
            targetConnectionId, // targetId
            offer.sdp           // sdp string
        );
    }

    hangupBtn.disabled = false;
    hangupBtn.onclick = hangUp;
}

function addFriendToList(f) {
    if (!f.connectionId) return; 

    const li = document.createElement("li");
    const nameSpan = document.createElement("span");
    nameSpan.innerHTML = `<strong>${f.name}</strong>`;

    const btnCall = document.createElement("button");
    btnCall.textContent = "Gọi";
    btnCall.addEventListener("click", () => callUser(f.connectionId, f.name));

    li.appendChild(nameSpan);
    li.appendChild(btnCall);
    friendList.appendChild(li); 
}

// === CÁC HÀM KHÁC (HangUp, GetLocalStream) ===
function hangUp() {
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
    hangupBtn.disabled = true;
    currentTargetConnectionId = null;
    getLocalStream();
}


async function getLocalStream() {
    if (localStream) return;
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
        });
        localVideo.srcObject = localStream;
    } catch (err) {
        alert("Không thể truy cập camera/mic: " + err.message);
        localStream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true,
        });
        localVideo.srcObject = localStream;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    startSignalR();
    hangupBtn.disabled = true;
});