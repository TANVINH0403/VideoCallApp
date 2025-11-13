// Program.cs
using VideoCall.Application.Interfaces;
using VideoCall.Application.Services;
using VideoCall.Domain.Entities;
using VideoCall.Infrastructure.Data;
using VideoCall.Infrastructure.SignalR;
using VideoCall.Web.Application.Services;
using VideoCall.Web.Domain.Entities;

var builder = WebApplication.CreateBuilder(args);

// === DI – SOLID ===
builder.Services.AddSingleton<IRepository<User>>(sp =>
{
    var users = new List<User>
    {
        new("Nam", BCrypt.Net.BCrypt.HashPassword("123")),
        new("Hùng", BCrypt.Net.BCrypt.HashPassword("123")), // <-- Đã sửa lỗi "Hng"
        new("Lan", BCrypt.Net.BCrypt.HashPassword("123")),
        new("Minh", BCrypt.Net.BCrypt.HashPassword("123"))
    };
    return new InMemoryRepository<User>(users);
});

builder.Services.AddSingleton<IRepository<Friendship>>(sp =>
    new InMemoryRepository<Friendship>(new List<Friendship>()));

// SỬA LỖI Ở ĐÂY: UserService phải là Singleton để chia sẻ danh sách online
builder.Services.AddSingleton<IUserService, UserService>();
builder.Services.AddScoped<IFriendshipService, FriendshipService>(); // FriendshipService có thể là Scoped

builder.Services.AddSignalR();
builder.Services.AddControllers();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", p =>
        p.AllowAnyHeader()
         .AllowAnyMethod()
         .AllowCredentials()
         .SetIsOriginAllowed(_ => true));
});

var app = builder.Build();

// Đặt login.html là trang mặc định (Đúng)
app.UseDefaultFiles(new DefaultFilesOptions
{
    DefaultFileNames = new List<string> { "login.html" }
});

app.UseStaticFiles();
app.UseRouting();
app.UseCors("AllowAll");

app.MapControllers();
app.MapHub<VideoCallHub>("/hubs");
app.MapFallbackToFile("index.html"); // Dành cho trang chính sau khi đăng nhập

app.Run();