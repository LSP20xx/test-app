FROM node:16

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Eliminar node_modules si existe
RUN rm -rf node_modules

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Expose the port the app runs on
EXPOSE 6000

# Command to run the server
CMD ["npm", "start"]
