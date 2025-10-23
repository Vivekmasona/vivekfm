# Use Node.js lightweight image
FROM node:18-slim

# Set working directory
WORKDIR /app

# Copy files
COPY package*.json ./
COPY index.js ./

# Install only production dependencies
RUN npm install --only=production

# Expose port
EXPOSE 10000

# Start the app
CMD ["npm", "start"]
