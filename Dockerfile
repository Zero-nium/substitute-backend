FROM node:22-slim

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Backend dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Frontend build
COPY substitute-frontend/ ./substitute-frontend/
RUN cd substitute-frontend && npm install && npm run build

# Move built frontend to where Express expects it
RUN mkdir -p public && cp -r substitute-frontend/dist public/dist
RUN rm -rf substitute-frontend/node_modules

# Backend source
COPY src/ ./src/
COPY start.sh ./
RUN chmod +x start.sh

EXPOSE 3000

CMD ["./start.sh"]
