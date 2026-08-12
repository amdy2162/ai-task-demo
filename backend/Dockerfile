# ==============================================================================
# ASP.NET Core 後端 Dockerfile (極速秒開版本)
# ==============================================================================
# 說明：直接採用預先編譯好的發布檔，避開容器內漫長重複的網路下載，0 秒建置！
# ==============================================================================

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

# 設定 ASP.NET Core 監聽連接埠 5000
ENV ASPNETCORE_URLS=http://+:5000
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 5000

# 直接複製發布產物
COPY ./publish .

ENTRYPOINT ["dotnet", "AiTaskDemo.Api.dll"]
