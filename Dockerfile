FROM node:20

RUN apt-get update && apt-get install -y \
    libvips-dev \
    libjpeg-dev \
    libpng-dev \
    libtiff-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci

COPY . .

ENV MONGO_URI=mongodb://mongo:27017/yourdbname
ENV DEFAULT_BATCH_SIZE=10

CMD ["npm", "run", "dev"]