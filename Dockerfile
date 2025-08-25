FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY prisma ./prisma
COPY .env.example ./.env
COPY dist ./dist
RUN npm install prisma @prisma/client && npx prisma generate
ENV PORT=4000
EXPOSE 4000
CMD ["node", "dist/server.js"]

