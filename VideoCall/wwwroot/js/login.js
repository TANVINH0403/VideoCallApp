// login.js - Code đã sửa hoàn chỉnh

const container = document.querySelector(".container");
const registerBtn = document.querySelector(".register-btn");
const loginBtn = document.querySelector(".login-btn");

// --- 1. XỬ LÝ CHUYỂN ĐỔI GIAO DIỆN (TOGGLE) ---
if (registerBtn) {
    registerBtn.addEventListener("click", () => {
        container.classList.add("active");
    });
}

if (loginBtn) {
    loginBtn.addEventListener("click", () => {
        container.classList.remove("active");
    });
}

// --- 2. XỬ LÝ ĐĂNG NHẬP ---
const loginForm = document.getElementById("loginForm");

if (loginForm) {
    // QUAN TRỌNG: Thêm từ khóa 'async' ở đây để dùng được 'await' bên trong
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault(); // Ngăn không cho trang web load lại

        // Lấy dữ liệu từ ô nhập liệu
        const nameInput = document.getElementById("loginName").value;
        const passwordInput = document.getElementById("loginPassword").value;

        // Tạo object dữ liệu gửi đi (Khớp với LoginRequest.cs của bạn: Username, Password)
        const loginData = {
            name: nameInput,
            password: passwordInput,
        };

        try {
            // Gửi yêu cầu đăng nhập đến API Server
            // Đảm bảo đường dẫn khớp với AuthController: /api/auth/login
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(loginData),
            });

            if (response.ok) {
                // Đăng nhập thành công
                const result = await response.json();

                // Lưu token và tên vào LocalStorage
                localStorage.setItem("authToken", result.token);
                localStorage.setItem("userName", result.name);

                alert("Đăng nhập thành công!");

                // Chuyển hướng sang trang gọi video
                window.location.href = "/index.html";
            } else {
                // Đăng nhập thất bại (401 Unauthorized)
                const errorText = await response.text();
                alert("Đăng nhập thất bại: " + errorText);
            }
        } catch (error) {
            console.error("Lỗi kết nối:", error);
            alert("Không thể kết nối đến máy chủ (Server chưa chạy hoặc sai URL).");
        }
    });
}