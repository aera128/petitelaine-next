FROM node:22-alpine

WORKDIR /app

# Copy only package.json first for cache
COPY package.json ./

# Install dependencies
RUN npm install

# Copy the rest of the app
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Start the server
CMD ["node", ".output/server/index.mjs"]
