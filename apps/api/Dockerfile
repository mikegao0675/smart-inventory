FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm i --registry=https://registry.npmmirror.com
COPY . .
EXPOSE 4000
CMD ["node", "src/app.js"]
