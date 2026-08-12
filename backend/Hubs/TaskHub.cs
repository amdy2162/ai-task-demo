using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace AiTaskDemo.Api.Hubs;

[Authorize]
public sealed class TaskHub : Hub
{
}
