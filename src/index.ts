import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { createClient } from "redis";

// Interface para o Post
interface Post {
  id: string;
  quem: string;
  data_hora: string;
  comentario: string; 
  publico: boolean;
}

// Configuração do Redis
const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
});

// Conectar ao Redis
redisClient.on("error", (err) => console.error("Redis Client Error", err));
redisClient.on("connect", () => console.log("✅ Redis conectado com sucesso!"));

await redisClient.connect();

// Funções auxiliares para Redis
const POST_IDS_KEY = "posts:ids";
const POST_KEY_PREFIX = "post:";

async function generatePostId(): Promise<string> {
  const count = await redisClient.incr("posts:counter");
  return count.toString();
}

async function savePost(post: Post): Promise<void> {
  const postKey = `${POST_KEY_PREFIX}${post.id}`;
  await redisClient.set(postKey, JSON.stringify(post));
  await redisClient.sAdd(POST_IDS_KEY, post.id);
}

async function getPostById(id: string): Promise<Post | null> {
  const postKey = `${POST_KEY_PREFIX}${id}`;
  const postData = await redisClient.get(postKey);
  return postData ? JSON.parse(postData) : null;
}

async function getAllPosts(): Promise<Post[]> {
  const ids = await redisClient.sMembers(POST_IDS_KEY);
  const posts: Post[] = [];

  for (const id of ids) {
    const post = await getPostById(id);
    if (post) {
      posts.push(post);
    }
  }

  return posts.sort(
    (a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime()
  );
}

async function searchPostsByExpression(expression: string): Promise<Post[]> {
  const allPosts = await getAllPosts();
  const lowerExpression = expression.toLowerCase();

  return allPosts.filter((post) =>
    post.comentario.toLowerCase().includes(lowerExpression)
  );
}

async function getPostsCount(): Promise<number> {
  return await redisClient.sCard(POST_IDS_KEY);
}

// Criar app Elysia
const app = new Elysia()
  .use(
    swagger({
      documentation: {
        info: {
          title: "Rede Social API - Sistema de Posts",
          version: "1.0.50",
          description:
            "API REST para gerenciamento de posts de uma rede social usando Elysia e Redis",
        },
        tags: [
          { name: "posts", description: "Endpoints para gerenciar posts" },
        ],
      },
    })
  )
  .get("/", () => "Rede Social API - Posts")

  // POST /post - criar um post
  .post(
    "/post",
    async ({ body }) => {
      try {
        const { quem, comentario, publico } = body as {
          quem: string;
          comentario: string;
          publico: boolean;
        };

        if (!quem || !comentario || typeof publico !== "boolean") {
          return {
            error: "Dados inválidos",
            message:
              "É necessário fornecer: quem (string), comentario (string), publico (boolean)",
          };
        }

        const id = await generatePostId();
        const post: Post = {
          id,
          quem,
          data_hora: new Date().toISOString(),
          comentario,
          publico,
        };

        await savePost(post);

        return {
          success: true,
          post,
        };
      } catch (error: any) {
        return {
          error: "Erro ao criar post",
          message: error.message,
        };
      }
    },
    {
      detail: {
        tags: ["posts"],
        summary: "Criar um novo post",
        description: "Cria um novo post na rede social com os dados fornecidos",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["quem", "comentario", "publico"],
                properties: {
                  quem: {
                    type: "string",
                    description: "Nome do autor do post",
                  },
                  comentario: {
                    type: "string",
                    description: "Conteúdo do post",
                  },
                  publico: {
                    type: "boolean",
                    description:
                      "Se o post é público (true) ou privado (false)",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Post criado com sucesso",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    post: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        quem: { type: "string" },
                        data_hora: { type: "string" },
                        comentario: { type: "string" },
                        publico: { type: "boolean" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }
  )

  // GET /post/count - consultar quantidade de posts
  .get(
    "/post/count",
    async () => {
      try {
        const count = await getPostsCount();
        return {
          count,
        };
      } catch (error: any) {
        return {
          error: "Erro ao contar posts",
          message: error.message,
        };
      }
    },
    {
      detail: {
        tags: ["posts"],
        summary: "Consultar quantidade de posts",
        description: "Retorna a quantidade total de posts cadastrados",
        responses: {
          200: {
            description: "Quantidade de posts",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    count: {
                      type: "number",
                      description: "Quantidade total de posts",
                    },
                  },
                },
              },
            },
          },
        },
      },
    }
  )

  // GET /post - consulta todos posts
  .get(
    "/post",
    async () => {
      try {
        const posts = await getAllPosts();
        return {
          posts,
          count: posts.length,
        };
      } catch (error: any) {
        return {
          error: "Erro ao buscar posts",
          message: error.message,
        };
      }
    },
    {
      detail: {
        tags: ["posts"],
        summary: "Listar todos os posts",
        description:
          "Retorna todos os posts cadastrados, ordenados por data (mais recentes primeiro)",
        responses: {
          200: {
            description: "Lista de posts",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    posts: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          quem: { type: "string" },
                          data_hora: { type: "string" },
                          comentario: { type: "string" },
                          publico: { type: "boolean" },
                        },
                      },
                    },
                    count: { type: "number" },
                  },
                },
              },
            },
          },
        },
      },
    }
  )

  // GET /post/{id} ou GET /post/{exp} - consulta 1 post por ID ou busca por expressão
  .get(
    "/post/:param",
    async ({ params: { param } }) => {
      try {
        // Se o parâmetro for um número, trata como ID
        const isNumericId = /^\d+$/.test(param);

        if (isNumericId) {
          // Busca por ID
          const post = await getPostById(param);

          if (!post) {
            return {
              error: "Post não encontrado",
              id: param,
            };
          }

          return {
            post,
          };
        } else {
          // Busca por expressão no comentário
          const posts = await searchPostsByExpression(param);
          return {
            posts,
            count: posts.length,
            expression: param,
          };
        }
      } catch (error: any) {
        return {
          error: "Erro ao buscar post",
          message: error.message,
        };
      }
    },
    {
      detail: {
        tags: ["posts"],
        summary: "Buscar post por ID ou expressão",
        description:
          "Busca um post específico por ID (se o parâmetro for numérico) ou busca posts que contenham uma expressão no comentário (se o parâmetro for texto). A busca por expressão é case-insensitive. Parâmetro: param (string) - ID numérico do post ou expressão para buscar nos comentários.",
        responses: {
          200: {
            description: "Post encontrado ou lista de posts",
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    {
                      type: "object",
                      properties: {
                        post: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            quem: { type: "string" },
                            data_hora: { type: "string" },
                            comentario: { type: "string" },
                            publico: { type: "boolean" },
                          },
                        },
                      },
                    },
                    {
                      type: "object",
                      properties: {
                        posts: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              id: { type: "string" },
                              quem: { type: "string" },
                              data_hora: { type: "string" },
                              comentario: { type: "string" },
                              publico: { type: "boolean" },
                            },
                          },
                        },
                        count: { type: "number" },
                        expression: { type: "string" },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    }
  )
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
