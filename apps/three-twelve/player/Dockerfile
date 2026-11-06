FROM node:26.13.0-slim
ARG DAVEY_VERSION
WORKDIR /app
RUN npm install --no-save --omit=dev "@snazzah/davey@${DAVEY_VERSION}"
COPY player.mjs /app/player.mjs
USER node
EXPOSE 8080
ENTRYPOINT ["node", "/app/player.mjs"]
