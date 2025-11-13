// wwwroot/login.js (Bản sửa lỗi)

// Toggle password visibility
document
    .getElementById("togglePassword")
    .addEventListener("click", function () {
        const passwordInput = document.getElementById("password");
        const icon = this.querySelector("i");

        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            icon.classList.remove("fa-eye");
            icon.classList.add("fa-eye-slash");
        } else {
            passwordInput.type = "password";
            icon.classList.remove("fa-eye-slash");
            icon.classList.add("fa-eye");
        }
    });

// Handle form submit (ĐÃ SỬA LOGIC API)
document.getElementById("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    // SỬA Ở ĐÂY: Lấy giá trị từ id="username"
    const name = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const errorDiv = document.getElementById("error");

    if (!name || !password) {
        errorDiv.textContent = "Vui lòng nhập đầy đủ thông tin.";
        errorDiv.style.display = "block";
        return;
    }

    // Bắt đầu gọi API
    try {
        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name, password: password })
        });

        if (res.ok) {
            const { token } = await res.json();
            localStorage.setItem("authToken", token);
            window.location.href = "/"; // Chuyển đến index.html
        } else {
            const errorText = await res.text();
            errorDiv.textContent = errorText || "Sai tên hoặc mật khẩu!";
            errorDiv.style.display = "block";
        }
    } catch (err) {
        errorDiv.textContent = "Lỗi kết nối máy chủ!";
        errorDiv.style.display = "block";
    }
});

// Social login
document
    .querySelector(".social-btn.google")
    .addEventListener("click", function () {
        alert("Đăng nhập với Google");
    });
document
    .querySelector(".social-btn.facebook")
    .addEventListener("click", function () {
        alert("Đăng nhập với Facebook");
    });

// Sign up link
document.getElementById("signupLink").addEventListener("click", function (e) {
    e.preventDefault();
    alert("Chuyển hướng đến trang đăng ký");
});