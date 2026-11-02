
# Use Node.js LTS
FROM node:22-bookworm-slim

WORKDIR /app

# Copy workspace manifests first
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/package.json
COPY backend/package.json ./backend/package.json

# Install root and workspace dependencies
RUN npm ci

# Copy the application, including shared/
COPY . .

# Build frontend and backend
RUN npm run build

ENV NODE_ENV=production

# Backend port (adjust if your production server uses another port)
EXPOSE 3001

# Start the application
CMD ["npm", "start"]
