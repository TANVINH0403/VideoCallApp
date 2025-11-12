// Controllers/AuthController.cs
using Microsoft.AspNetCore.Mvc;
using System.Text;
using VideoCall.Application.Interfaces;
using VideoCall.Web.Application.Services;

namespace VideoCall.Web.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController(IUserService userService) : ControllerBase
    {
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginModel model)
        {
            var user = await _userService.LoginAsync(model.Name, model.Password);
            if (user == null) return Unauthorized("Sai tên hoặc mật khẩu");

            var token = Convert.ToBase64String(Encoding.UTF8.GetBytes(user.Id));
            return Ok(new { token, name = user.Name });
        }
    }

    public class LoginModel
    {
        public string Name { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
}