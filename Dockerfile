# Usamos una imagen ligera de Node.js
FROM node:18-slim

# Creamos el directorio de la aplicación
WORKDIR /app

# Copiamos los archivos de dependencias
COPY package*.json ./

# Instalamos las dependencias
RUN npm install

# Copiamos el resto del código (incluyendo la carpeta public y database.sqlite)
COPY . .

# Exponemos el puerto que usa tu server.js
EXPOSE 3000

# Comando para arrancar la app
CMD ["node", "server.js"]