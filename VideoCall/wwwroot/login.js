document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username'); // Tham chiếu đến ID mới
    const passwordInput = document.getElementById('password');
    const togglePasswordButton = document.getElementById('togglePassword');

    // --- 1. Tạo và chèn element hiển thị lỗi ---
    const errorDisplay = document.createElement('p');
    errorDisplay.style.color = 'red';
    errorDisplay.style.marginTop = '10px';
    errorDisplay.style.textAlign = 'center';
    errorDisplay.style.fontWeight = 'bold';

    // Chèn thông báo lỗi vào form trước nút Đăng nhập
    const loginButton = loginForm.querySelector('.login-btn');
    if (loginButton) {
        loginForm.insertBefore(errorDisplay, loginButton);
    }


    // --- 2. LOGIC HIỂN THỊ/ẨN MẬT KHẨU ---
    togglePasswordButton.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);

        // Thay đổi icon mắt (Font Awesome)
        const icon = togglePasswordButton.querySelector('i');
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash'); // Giả định bạn có fa-eye-slash
    });


    // --- 3. LOGIC XỬ LÝ ĐĂNG NHẬP (Kết nối với ASP.NET Core API) ---
    loginForm.addEventListener('submit', async function (event) {
        event.preventDefault();

        const usernameValue = usernameInput.value; // Lấy giá trị từ trường usernameInput// Dùng giá trị email làm Username
        const passwordValue = passwordInput.value;

        errorDisplay.textContent = ''; // Xóa thông báo lỗi cũ

        try {
            const response = await fetch('/api/Account/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                // Body JSON phải khớp với lớp LoginRequest.cs (Username, Password)
                body: JSON.stringify({
                    // Gửi emailValue dưới tên thuộc tính 'Username'
                    Username: usernameValue,
                    Password: passwordValue
                })
            });

            if (response.ok) {
                // Đăng nhập thành công (200 OK), chuyển hướng đến trang chính
                console.log('Đăng nhập thành công.');
                window.location.href = '/index.html';
            } else if (response.status === 401) {
                // Xác thực thất bại (401 Unauthorized)
                const errorData = await response.json();
                errorDisplay.textContent = errorData.message || 'Tên đăng nhập hoặc mật khẩu không đúng.';
            } else {
                // Các lỗi HTTP khác (ví dụ: 500 Internal Server Error)
                errorDisplay.textContent = 'Lỗi máy chủ. Vui lòng thử lại sau.';
            }
        } catch (error) {
            console.error('Lỗi kết nối API:', error);
            errorDisplay.textContent = 'Không thể kết nối đến máy chủ. Kiểm tra kết nối mạng.';
        }
    });
});