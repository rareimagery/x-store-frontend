FROM php:8.3-fpm

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git unzip curl nginx libpng-dev libjpeg-dev libfreetype6-dev \
    libpq-dev libzip-dev libicu-dev libonig-dev \
    && rm -rf /var/lib/apt/lists/*

# Install PHP extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
    gd pdo pdo_pgsql pgsql opcache zip intl mbstring

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Copy Nginx config
COPY nginx.conf /etc/nginx/sites-available/default
RUN ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default

# Copy Docker-specific Drupal settings
COPY settings.docker.php /usr/local/share/settings.docker.php

# Install pg_isready for health checks
RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*

# Copy entrypoint
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# PHP config
RUN echo "memory_limit = 512M" > /usr/local/etc/php/conf.d/memory.ini \
    && echo "upload_max_filesize = 64M" >> /usr/local/etc/php/conf.d/memory.ini \
    && echo "post_max_size = 64M" >> /usr/local/etc/php/conf.d/memory.ini

WORKDIR /var/www/html

EXPOSE 8080

ENTRYPOINT ["entrypoint.sh"]
