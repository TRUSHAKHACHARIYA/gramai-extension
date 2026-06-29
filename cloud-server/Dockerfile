FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN mkdir -p data
ENV PORT=3847
EXPOSE 3847
CMD ["npm", "start"]
