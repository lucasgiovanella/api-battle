# Rede Social API - Sistema de Posts

Esta é uma API REST simples para gerenciar posts de uma rede social. A aplicação foi desenvolvida com Elysia (framework web para Bun) e usa Redis como banco de dados para armazenar os posts.

## Arquitetura

A aplicação funciona de forma simples: o cliente HTTP faz requisições para o servidor Elysia que roda na porta 3000, e o servidor se conecta ao Redis que está rodando em um container Docker na porta 6379. O Redis armazena os dados usando três tipos de chaves: posts:counter que é um contador incremental para gerar IDs únicos, posts:ids que é um SET contendo todos os IDs dos posts para facilitar a listagem, e post:{id} que são strings JSON com os dados completos de cada post. Por exemplo, se houver três posts, teremos posts:counter = 3, posts:ids = SET["1", "2", "3"], e três chaves post:1, post:2, post:3, cada uma contendo um JSON com os dados do post.

## Estrutura de dados

Cada post tem os seguintes campos: id que é uma string gerada automaticamente, quem que é o nome do autor do post, data_hora que é a data e hora em formato ISO 8601, comentario que é o conteúdo do post, e publico que é um boolean indicando se o post é público ou privado. Um exemplo de post seria {"quem":"Thiaguin","data_hora":"2024-01-15T10:30:00.000Z","comentario":"Olá mundo! Este é meu primeiro post.","publico":true}.

## Endpoints

A API tem cinco endpoints principais. O primeiro é POST /post que cria um novo post. Você precisa enviar um JSON no body com os campos quem (string), comentario (string) e publico (boolean). A resposta será um JSON com success: true e o objeto post criado, incluindo o id gerado automaticamente e a data_hora preenchida. Se os dados estiverem inválidos, retornará um erro com a mensagem apropriada.

O segundo endpoint é GET /post/count que retorna simplesmente a quantidade total de posts cadastrados no formato {"count":42}.

O terceiro endpoint é GET /post que retorna todos os posts cadastrados, ordenados por data com os mais recentes primeiro. A resposta contém um array posts com todos os posts e um campo count com a quantidade.

O quarto endpoint é GET /post/{id} que busca um post específico pelo seu ID numérico. Se encontrar, retorna o post, se não encontrar retorna um erro dizendo que o post não foi encontrado.

O quinto endpoint é GET /post/{exp} que busca posts que contenham uma expressão no campo comentario. A busca não diferencia maiúsculas de minúsculas. A resposta contém um array posts com os posts encontrados, um count e a expression usada.

É importante notar que os endpoints GET /post/{id} e GET /post/{exp} compartilham a mesma rota /post/:param. O sistema detecta automaticamente: se o parâmetro for um número puro, trata como busca por ID, se for texto, trata como busca por expressão.


## Funcionalidades

Os IDs são gerados automaticamente usando um contador incremental no Redis, garantindo unicidade e sequência. Os dados são persistidos no Redis usando AOF (Append Only File), então os dados sobrevivem a reinicializações do container. Quando você lista os posts, eles vêm ordenados por data com os mais recentes primeiro. A busca por expressão não diferencia maiúsculas de minúsculas.
