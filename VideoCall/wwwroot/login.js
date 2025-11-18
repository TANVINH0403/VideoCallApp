const container = document.querySelector(".container");
const registerBtn = document.querySelector(".register-btn");
const loginBtn = document.querySelector(".login-btn");

registerBtn.addEventListener("click", () => {
  container.classList.add("active");
});

loginBtn.addEventListener("click", () => {
  container.classList.remove("active");
});

if (loginBtn && container) {
  loginBtn.addEventListener("click", () => {
    container.classList.remove("active");
  });
}

// --- Logic xử lý ĐĂNG NHẬP ---

const loginForm = document.getElementById("loginForm"); // Thay 'loginForm' bằng ID của form Đăng nhập của bạn

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // Ngăn chặn hành vi submit mặc định của form

    // 1. Lấy dữ liệu từ input (CẦN ID CHÍNH XÁC CỦA INPUT TÊN VÀ MẬT KHẨU)
    const nameInput = document.getElementById("loginName").value;
    const passwordInput = document.getElementById("loginPassword").value;

    const loginData = {
      name: nameInput,
      password: passwordInput,
    };

    try {
      // 2. Gửi yêu cầu POST đến Controller (sử dụng fetch API)
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginData),
      });

      if (response.ok) {
        // Đăng nhập THÀNH CÔNG (HTTP 200 OK)
        const result = await response.json();

        // 3. Lưu token và tên người dùng 
        localStorage.setItem("authToken", result.token);
        localStorage.setItem("userName", result.name);

        // 4. CHUYỂN HƯỚNG sang trang chính
        window.location.href = "/index.html";
      } else {
        // Đăng nhập THẤT BẠI (ví dụ: HTTP 401 Unauthorized)
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
