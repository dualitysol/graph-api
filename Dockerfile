FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY index.ts ./
COPY packages/ ./packages/
COPY src/ ./src/
COPY assets/ ./assets/

RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

COPY --from=builder /app/dist/index.js ./index.js
COPY --from=builder /app/dist/packages/ ./packages/
COPY --from=builder /app/dist/src/ ./src/
COPY --from=builder /app/node_modules/ ./node_modules/
COPY assets/ ./assets/

EXPOSE 3000

CMD ["node", "index.js"]

