# PantryPilot MCP — Node 20+ Streamable HTTP
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV ALLOWED_HOSTS=localhost,127.0.0.1,::1
ENV DATABASE_PATH=/data/pantrypilot.sqlite
COPY --from=build /app/package.json /app/package-lock.json* ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
RUN mkdir -p /data && chown -R node:node /data /app
EXPOSE 3000
USER node
CMD ["node", "dist/server.js"]
