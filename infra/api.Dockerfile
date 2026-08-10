FROM node:22-alpine AS build
WORKDIR /repo
COPY package.json ./
COPY api/package.json api/
COPY app/package.json app/
COPY packages/shared/package.json packages/shared/
COPY packages/sdk/package.json packages/sdk/
RUN npm install --no-audit --no-fund
COPY packages packages
COPY api api
RUN npm run build -w api

FROM node:22-alpine
WORKDIR /srv
ENV NODE_ENV=production
COPY --from=build /repo/node_modules node_modules
COPY --from=build /repo/api/dist dist
COPY --from=build /repo/api/package.json package.json
EXPOSE 8787
CMD ["node", "dist/server.js"]
