# Use the official Node.js image (Alpine version for a smaller size)
FROM node:18-alpine 

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the container
COPY package*.json ./

# Install only production dependencies (avoids installing devDependencies)
RUN npm ci --only=production

# Copy the rest of the application files to the container
COPY . .

# Expose port 3000 (the application runs on this port)
EXPOSE 3004

# Command to start the application when the container runs
CMD ["node", "src/server.js"]
