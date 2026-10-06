FROM node:25-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY src ./src
COPY public ./public
COPY scripts/build.mjs ./scripts/build.mjs
RUN npm run build && npm prune --omit=dev --ignore-scripts

FROM gcr.io/distroless/nodejs24-debian13:nonroot
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0
COPY --from=build --chown=65532:65532 /app/node_modules ./node_modules
COPY --from=build --chown=65532:65532 /app/dist ./dist
COPY --from=build --chown=65532:65532 /app/package.json ./package.json
USER 65532:65532
EXPOSE 3000
CMD ["dist/server.js"]

