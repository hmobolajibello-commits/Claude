# Voice Studio. No dependencies, so no install step and no build stage.
FROM node:22-alpine

WORKDIR /app
COPY package.json ./
COPY server.js ./
COPY lib ./lib
COPY public ./public

# /data is where settings, account tokens and generated code live. Mount a
# volume here to keep them across restarts; without one they are lost on every
# redeploy, which on a free tier is normal and expected.
ENV STUDIO_DATA_DIR=/data/.studio \
    STUDIO_WORKSPACE=/data/workspace \
    HOST=0.0.0.0 \
    PORT=8080 \
    NODE_ENV=production

RUN mkdir -p /data && chown -R node:node /data
VOLUME ["/data"]
USER node

EXPOSE 8080

# The server refuses to start on 0.0.0.0 without STUDIO_PASSWORD, so a
# misconfigured deploy fails loudly instead of publishing your API keys.
CMD ["node", "server.js", "--trust-proxy"]
