let connection, pc, localStream;
const remoteVideo = document.getElementById("remoteVideo");
const localVideo = document.getElementById("localVideo");
const chat = document.getElementById("chat");
const chatWith = document.getElementById("chatWith");
const callBtn = document.getElementById("callBtn");
const hangupBtn = document.getElementById("hangupBtn");
let targetId = "";

document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("authToken");
    if (!token) { window.location.href = "/login.html"; return; }

    connection = new signalR.HubConnectionBuilder()
        .withUrl(`/hubs?token=${token}`)
        .build();

    connection.on("LoadFriends", friends => renderFriends(friends));
    connection.on("FriendOnline", (id, name) => updateStatus(id, true));
    connection.on("FriendOffline", id => updateStatus(id, false));
    connection.on("IncomingCall", (id, name) => {
        if (confirm(`${name} đang gọi...`)) {
            connection.invoke("AcceptCall", id);
        } else {
            connection.invoke("RejectCall", id);
        }
    });
    connection.on("CallAccepted", id => startCall(id, false));
    connection.on("CallRejected", () => alert("Cuộc gọi bị từ chối"));
    connection.on("ReceiveOffer", (id, sdp) => handleOffer(id, sdp));
    connection.on("ReceiveAnswer", sdp => {
        if (pc) pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp }));
    });
    connection.on("ReceiveIce", candidate => {
        if (pc) pc.addIceCandidate(new RTCIceCandidate(candidate));
    });
    connection.on("ReceiveFriendRequest", (id, name) => {
        if (confirm(`${name} muốn kết bạn`)) connection.invoke("AcceptFriendRequest", id);
    });

    await connection.start();
});

function renderFriends(friends) {
    const list = document.getElementById("friendsList");
    list.innerHTML = "";
    friends.forEach(f => {
        const div = document.createElement("div");
        div.className = `friend ${f.isOnline ? "online" : ""}`;
        div.dataset.id = f.id;
        div.innerHTML = `
            <img src="https://i.pravatar.cc/40?u=${f.id}"/>
            <div class="info">
                <div>${f.name}</div>
                <div class="status"></div>
            </div>
        `;
        div.onclick = () => openChat(f.id, f.name);
        list.appendChild(div);
    });
}

function updateStatus(id, online) {
    const el = document.querySelector(`.friend[data-id="${id}"]`);
    if (el) el.classList.toggle("online", online);
}

function openChat(id, name) {
    targetId = id;
    chatWith.textContent = name;
    chat.style.display = "flex";
    document.getElementById("videoContainer").style.display = "none";
    callBtn.style.display = "inline-block";
    hangupBtn.style.display = "none";
}

callBtn.onclick = () => connection.invoke("CallFriend", targetId);
hangupBtn.onclick = () => endCall();

async function startCall(id, isCaller) {
    pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    localVideo.srcObject = localStream;

    pc.ontrack = e => { remoteVideo.srcObject = e.streams[0]; };
    pc.onicecandidate = e => {
        if (e.candidate) {
            connection.invoke("SendIce", id, e.candidate.toJSON());
        }
    };

    if (isCaller) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        connection.invoke("SendOffer", id, offer.sdp);
    }

    document.getElementById("videoContainer").style.display = "block";
    callBtn.style.display = "none";
    hangupBtn.style.display = "inline-block";
}

async function handleOffer(id, sdp) {
    await startCall(id, false);
    await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp }));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    connection.invoke("SendAnswer", id, answer.sdp);
}

function endCall() {
    if (pc) { pc.close(); pc = null; }
    if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
        localStream = null;
    }
    remoteVideo.srcObject = null;
    localVideo.srcObject = null;
    document.getElementById("videoContainer").style.display = "none";
    callBtn.style.display = "inline-block";
    hangupBtn.style.display = "none";
}