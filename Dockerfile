FROM node:20

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm cache clean -f

RUN npm install

RUN npm install --os=linux --cpu=arm64 sharp

COPY . .

ENV MONGO_URI=mongodb://mongo:27017/yourdbname
ENV DEFAULT_BATCH_SIZE=10

CMD ["npm", "run", "dev"]