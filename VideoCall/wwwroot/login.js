// =========================================================
// KHỐI 1: XỬ LÝ CHUYỂN ĐỔI GIAO DIỆN (UI)
// =========================================================

const container = document.querySelector(".container");
// Giả định đây là nút "SIGN UP"
const registerBtn = document.querySelector(".register-btn");
// Giả định đây là nút "LOG IN" dùng để chuyển đổi trạng thái UI 
const loginBtn = document.querySelector(".login-btn");

// Chuyển sang giao diện Đăng ký (Thêm class 'active')
if (registerBtn) {
    registerBtn.addEventListener("click", () => {
        if (container) {
            container.classList.add("active");
        }
    });
}

// Chuyển về giao diện Đăng nhập (Xóa class 'active')
// Lưu ý: Nếu nút này là nút Submit, bạn cần chỉnh lại logic này.
if (loginBtn && container) {
    loginBtn.addEventListener("click", () => {
        container.classList.remove("active");
    });
}

// =========================================================
// KHỐI 2: XỬ LÝ LOGIC ĐĂNG NHẬP (API CALL)
// =========================================================

const loginForm = document.getElementById("loginForm");
const API_URL = 'ĐIỀN_ĐỊA_CHỈ_API_ĐĂNG_NHẬP_CỦA_BẠN_VÀO_ĐÂY';
// Ví dụ: const API_URL = 'http://localhost:5000/api/auth/login';

if (loginForm) {
    // Chỉ cần 1 sự kiện submit duy nhất và **PHẢI LÀ HÀM ASYNC** để dùng await
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault(); // Ngăn chặn hành vi submit mặc định của form

        // 1. Lấy dữ liệu từ input (Đảm bảo ID của input là chính xác)
        const nameInput = document.getElementById("loginName") ? document.getElementById("loginName").value : '';
        const passwordInput = document.getElementById("loginPassword") ? document.getElementById("loginPassword").value : '';

        const loginData = {
            name: nameInput,
            password: passwordInput,
        };

        if (!nameInput || !passwordInput) {
            alert("Vui lòng nhập đầy đủ Tên người dùng và Mật khẩu.");
            return;
        }

        console.log("Login attempt with:", loginData);

        try {
            // 2. Gửi request đăng nhập
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(loginData),
            });

            if (response.ok) {
                // Đăng nhập THÀNH CÔNG (HTTP 200 OK)
                const result = await response.json(); // <--- Đã được sửa lỗi 'await'

                // 3. Lưu token và tên người dùng (Nếu API trả về đúng cấu trúc {token, name})
                localStorage.setItem("authToken", result.token);
                localStorage.setItem("userName", result.name);

                console.log("Đăng nhập thành công! Chuyển hướng...");
                // 4. CHUYỂN HƯỚNG sang trang chính
                window.location.href = "/index.html";

            } else {
                // Đăng nhập THẤT BẠI (ví dụ: HTTP 401 Unauthorized, 400 Bad Request)
                const errorText = await response.text();
                alert(`Đăng nhập thất bại. Mã lỗi: ${response.status}. Vui lòng kiểm tra lại thông tin.`);
                console.error("Login failed:", errorText);
            }
        } catch (error) {
            console.error("Lỗi kết nối:", error);
            alert("Không thể kết nối đến máy chủ. Vui lòng kiểm tra địa chỉ API.");
        }
    });
}