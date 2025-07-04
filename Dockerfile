# Use nginx as the base image for serving static files
FROM nginx:alpine

# Copy the application files to nginx html directory
COPY index.html /usr/share/nginx/html/
COPY *.txt /usr/share/nginx/html/

# Create a custom nginx configuration to serve on port 8000
RUN echo 'server {' > /etc/nginx/conf.d/default.conf && \
    echo '    listen 8000;' >> /etc/nginx/conf.d/default.conf && \
    echo '    server_name localhost;' >> /etc/nginx/conf.d/default.conf && \
    echo '    root /usr/share/nginx/html;' >> /etc/nginx/conf.d/default.conf && \
    echo '    index index.html;' >> /etc/nginx/conf.d/default.conf && \
    echo '    location / {' >> /etc/nginx/conf.d/default.conf && \
    echo '        try_files $uri $uri/ /index.html;' >> /etc/nginx/conf.d/default.conf && \
    echo '    }' >> /etc/nginx/conf.d/default.conf && \
    echo '}' >> /etc/nginx/conf.d/default.conf

# Expose port 8000
EXPOSE 8000

# Start nginx
CMD ["nginx", "-g", "daemon off;"] 