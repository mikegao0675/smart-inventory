FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm i --registry=https://registry.npmmirror.com
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# add simple proxy to api
RUN sed -i 's#location / {#location / { try_files $uri $uri/ /index.html; } \n location /api/ { proxy_pass http://api:4000/; proxy_set_header Host $host; }#' /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
