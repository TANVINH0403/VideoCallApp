using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace VideoCall.Controller
{
    [Authorize] // Bảo vệ toàn bộ Controller này
    [ApiController]
    [Route("api/[controller]")]
    public class ProtectedController : ControllerBase
    {
        [HttpGet]
        public IActionResult GetData()
        {
            // Chỉ người dùng đã đăng nhập mới truy cập được đây
            return Ok($"Dữ liệu bí mật cho {User.Identity.Name}");
        }
    }
}
