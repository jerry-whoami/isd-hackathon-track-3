FROM node:22-bookworm-slim

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --fetch-retries=5 --fetch-retry-maxtimeout=120000
RUN apt-get update \
  && apt-get install --yes --no-install-recommends libatomic1 libssl3 libvulkan1 libegl1 poppler-utils chromium \
  && rm -rf /var/lib/apt/lists/*
COPY . ./
ENV CHROME_BIN=/usr/bin/chromium
