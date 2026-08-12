# ==============================================================================
# ASP.NET Core 後端 Dockerfile (多階段建置 Multi-stage Build)
# ==============================================================================
# 檔案路徑：backend/Dockerfile
# 說明：
#   第一階段 (build)：使用包含編譯工具的完整 .NET 10 SDK 映像檔進行還原與編譯。
#   第二階段 (runtime)：使用極輕量的 .NET 10 ASP.NET Runtime 映像檔運行產物，
#                       大幅縮小最終 Docker Image 大小並提高安全性！
# ==============================================================================

# ------------------------------------------------------------------------------
# 階段 1：編譯與打包 (Build Stage)
# ------------------------------------------------------------------------------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# 複製專案檔並先進行 NuGet 套件還原（利用 Docker 快取機制，若 csproj 沒改就不會重複下載套件）
COPY ["AiTaskDemo.Api.csproj", "./"]
RUN dotnet restore "AiTaskDemo.Api.csproj"

# 複製其餘所有後端原始碼
COPY . .

# 執行生產環境編譯與發布 (Publish)
RUN dotnet publish "AiTaskDemo.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# ------------------------------------------------------------------------------
# 階段 2：正式運行環境 (Runtime Stage)
# ------------------------------------------------------------------------------
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

# 設定 ASP.NET Core 監聽連接埠 5000
ENV ASPNETCORE_URLS=http://+:5000
ENV ASPNETCORE_ENVIRONMENT=Production

# 對外暴露 5000 連接埠
EXPOSE 5000

# 從第一階段複製編譯後的產物
COPY --from=build /app/publish .

# 容器啟動指令：執行後端 Web API
ENTRYPOINT ["dotnet", "AiTaskDemo.Api.dll"]
