# ==============================================================================
# Vue 3 前端 Dockerfile (多階段建置 Multi-stage Build)
# ==============================================================================
# 檔案路徑：frontend/Dockerfile
# 說明：
#   第一階段 (build)：使用 Node.js 22 Alpine 映像檔，安裝依賴並執行 npm run build 打包。
#   第二階段 (runtime)：使用極度輕量的高效能 Nginx Alpine 網頁伺服器託管靜態網頁，
#                       最終映像檔僅約 20MB！
# ==============================================================================

# ------------------------------------------------------------------------------
# 階段 1：編譯與打包 (Build Stage)
# ------------------------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

# 先複製 package.json 與 lock 檔進行安裝（利用 Docker 快取加速後續建置）
COPY package*.json ./
RUN npm ci

# 複製所有前端原始碼
COPY . .

# 執行型別檢查與 Vite 生產環境打包產出 dist 目錄
RUN npm run build

# ------------------------------------------------------------------------------
# 階段 2：Nginx 靜態伺服器 (Runtime Stage)
# ------------------------------------------------------------------------------
FROM nginx:alpine AS final

# 複製自訂的 Nginx 設定檔
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 從第一階段複製打包後的靜態網頁檔案 (dist) 到 Nginx 預設網頁目錄
COPY --from=build /app/dist /usr/share/nginx/html

# 對外暴露標準 HTTP 80 連接埠
EXPOSE 80

# 容器啟動指令：啟動 Nginx 前台進程
CMD ["nginx", "-g", "daemon off;"]
