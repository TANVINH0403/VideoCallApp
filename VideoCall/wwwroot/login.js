const container = document.querySelector(".container");
const registerBtn = document.querySelector(".register-btn");
const loginBtn = document.querySelector(".login-btn");

// Khi bấm nút đăng ký → thêm class active
if (registerBtn && container) {
    registerBtn.addEventListener("click", () => {
        container.classList.add("active");
    });
}

// Khi bấm nút đăng nhập → bỏ class active
if (loginBtn && container) {
    loginBtn.addEventListener("click", () => {
        container.classList.remove("active");
    });
}

// --- Logic xử lý ĐĂNG NHẬP ---
const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault(); // Ngăn chặn hành vi submit mặc định

        // 1. Lấy dữ liệu từ input
        const nameInput = document.getElementById("loginName").value;
        const passwordInput = document.getElementById("loginPassword").value;

        const loginData = {
            name: nameInput,
            password: passwordInput,
        };

        console.log("Login attempt with:", loginData);

        try {
            // 2. Gửi request đến server
            const response = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(loginData),
            });

            if (response.ok) {
                // Đăng nhập thành công
                const result = await response.json();

                // 3. Lưu token và tên người dùng
                localStorage.setItem("authToken", result.token);
                localStorage.setItem("userName", result.name);

                alert("Đăng nhập thành công!");
                // 4. Chuyển hướng sang trang chính
                window.location.href = "/index.html";
            } else {
                // Đăng nhập thất bại
                const error = await response.text();
                alert(`Đăng nhập thất bại: ${error}`);
                console.error("Login failed:", error);
            }
        } catch (error) {
            console.error("Lỗi kết nối:", error);
            alert("Không thể kết nối đến máy chủ.");
        }
    });
}
