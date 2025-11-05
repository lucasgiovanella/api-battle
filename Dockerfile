FROM oven/bun:latest

WORKDIR /app

# Copiar arquivos de dependências
COPY package.json bun.lock ./

# Instalar dependências
RUN bun install

# Copiar código fonte
COPY . .

# Expor a porta da aplicação
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["bun", "run", "src/index.ts"]

