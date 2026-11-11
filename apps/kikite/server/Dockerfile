FROM node:26.13.0-slim
ARG AGENT_SDK_VERSION
WORKDIR /app
RUN npm install --no-save --omit=dev "@anthropic-ai/claude-agent-sdk@${AGENT_SDK_VERSION}"
COPY server.mjs /app/server.mjs
USER node
ENV HOME=/tmp
EXPOSE 8080
ENTRYPOINT ["node", "/app/server.mjs"]
