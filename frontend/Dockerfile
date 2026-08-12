# ==============================================================================
# Vue 3 前端 Dockerfile (極速 Nginx 版本)
# ==============================================================================
# 說明：直接採用 Vite 打包後的 dist 靜態檔案，避開容器內 npm 下載，0 秒建置！
# ==============================================================================

FROM nginx:alpine AS final

# 複製 Nginx 設定檔
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 直接複製前端打包產物
COPY ./dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
