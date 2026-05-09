FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

# Cloud Run sets PORT; default to 8080 for local docker run.
ENV PORT=8080
EXPOSE 8080

USER node
CMD ["node", "src/index.js"]
