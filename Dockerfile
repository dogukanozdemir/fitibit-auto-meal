FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --production && npm cache clean --force

COPY tsconfig.json ./
COPY src ./src

RUN npm install -D typescript && \
    npm run build && \
    npm uninstall typescript

RUN rm -rf src tsconfig.json

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/server.js"]
