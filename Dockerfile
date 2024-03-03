# syntax=docker/dockerfile:1

ARG NODE_VERSION=20.11.1

FROM node:${NODE_VERSION}-alpine

ENV NODE_ENV production

USER node

WORKDIR /home/node/app

COPY . .

RUN --mount=type=cache,target=/root/.npm \
    yarn install --production --frozen-lockfile

# Run the application.
# ENTRYPOINT [ "sh", "entrypoint.sh" ]