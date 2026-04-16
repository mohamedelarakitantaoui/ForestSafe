FROM node:20-slim

# Install build tools needed for better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Create data and uploads dirs (will be overridden by volumes in prod)
RUN mkdir -p data uploads

EXPOSE 3001

CMD ["node", "src/index.js"]
