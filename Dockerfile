FROM node:18-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY . .

# Crea la cartella data/ per NeDB (DB locale)
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "server.js"]
