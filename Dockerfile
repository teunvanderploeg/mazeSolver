# Use an official Nginx image as the base
FROM nginx:latest

# Set environment variables for paths
ENV APP_HOME /usr/share/nginx/html

# Copy the content of the repository to the Nginx HTML folder
COPY . $APP_HOME

# Expose port 80 to the outside world
EXPOSE 80

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"]