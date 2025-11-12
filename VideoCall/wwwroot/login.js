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

// Handle form submit
document.getElementById("loginForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if (!email || !password) {
    alert("Vui lòng điền đầy đủ thông tin đăng nhập");
    return;
  }

  console.log("Login attempt with:", { email, password });
  alert("Đăng nhập thành công!");
  // window.location.href = "main-app.html";
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
  // window.location.href = "signup.html";
});
