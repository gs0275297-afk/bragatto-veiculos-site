# Bragatto Veículos — site e painel do estoque

Site da **Bragatto Veículos** (Av. Filinto Müller, 1714 – Centro, Três Lagoas/MS) com estoque gerenciável, páginas individuais por veículo, contato por WhatsApp, visualização 3D opcional por veículo e painel administrativo com autenticação.

## Stack

| Camada | Escolha | Por quê |
| --- | --- | --- |
| Framework | Next.js 16 (App Router, Cache Components) + React 19 + TypeScript | SSR/streaming, SEO, imagens otimizadas |
| Banco | SQLite/libSQL via Drizzle ORM | arquivo local no desenvolvimento; **Turso** (libSQL remoto) em produção serverless, sem trocar código |
| Imagens | `sharp` + `next/image` (AVIF/WebP responsivos) | fotos normalizadas no upload, sem metadados/GPS |
| Armazenamento | local (`data/uploads`) ou S3 compatível (Cloudflare R2, AWS S3…) | escolha por variável de ambiente |
| 3D | Three.js, carregado **só sob demanda** | GLB/glTF, Draco e Meshopt |
| Validação | Zod | formulários do painel e uploads |
| Auth | sessões no banco (cookie httpOnly + hash SHA-256), senhas com scrypt | sem dependência externa, revogável |

Estilo: CSS Modules + tokens em `src/app/globals.css`. Fontes: Archivo (eixo de largura) e IBM Plex Mono.

## Rodando localmente

Requisitos: Node 20.9+ (testado com Node 24).

```bash
npm install
cp .env.example .env.local      # ajuste se necessário
npm run setup                    # cria o banco e carrega o estoque inicial (dados reais fornecidos)
npm run admin:create             # cria o primeiro usuário do painel (senha digitada no terminal)
npm run dev                      # http://localhost:3000  ·  painel em /admin
```

Outros comandos:

| Comando | O que faz |
| --- | --- |
| `npm run build` / `npm start` | build e servidor de produção |
| `npm run lint` / `npm run typecheck` | qualidade de código |
| `npm run db:generate` | gera migração após alterar `src/lib/db/schema.ts` |
| `npm run db:migrate` | aplica migrações (local ou Turso) |
| `npm run db:seed-demo` | cria 16 veículos **fictícios** para testar filtros/paginação (aparecem só com `SHOW_DEMO_DATA=true` e fora de produção) |
| `npm run db:seed-demo -- --remove` | apaga todos os registros de demonstração |
| `npm run assets:prepare` | reprocessa as fotos/logo originais (Python + Pillow) |
| `node scripts/make-test-glb.mjs` | gera um objeto geométrico de teste (não é um carro) para testar o 3D |

> **Aviso (OneDrive):** o projeto está dentro de uma pasta sincronizada pelo OneDrive. A sincronização de `node_modules`/`.next` deixa o `npm run dev` instável (recargas constantes). Recomendo mover o projeto para fora do OneDrive (ex.: `C:\projetos\bragatto`) ou excluir essas pastas da sincronização.

## Estrutura

```
src/
  app/(site)/            páginas públicas: home, /veiculos, /veiculos/[slug], 404
  app/admin/             painel: login, veículos, fotos, 3D, usuários, conta (+ actions.ts)
  app/api/admin/...      uploads de fotos e de modelos 3D (sessão + origem verificadas)
  app/media/[...key]     serve arquivos do armazenamento local
  components/home|site|vehicles|admin|ui
  components/vehicles/viewer3d/   motor 3D (engine.ts), visualizador, controles, status
  config/site.ts         dados da loja (endereço, WhatsApp, Instagram, campos opcionais)
  lib/                   banco, consultas, auth, storage, imagens, filtros, SEO, WhatsApp
scripts/                 migração, seeds, criação de admin, preparo de assets
seed/photos/             fotos tratadas dos veículos (origem: pastas fornecidas)
drizzle/                 migrações SQL
```

Os originais fornecidos (`imagens empresa/` e `veiculos e suas informaçoes/`) não foram alterados e **não são versionados** (contêm placas de terceiros sem desfoque e dados pessoais nas legendas). Guarde-os localmente; só são necessários para rodar `npm run assets:prepare` novamente.

## Painel administrativo (`/admin`)

- **Veículos:** criar, editar, publicar/despublicar, status (disponível, reservado, vendido), destaque na home, excluir (com confirmação). Preço vazio = “Preço sob consulta”. Observações internas nunca aparecem no site.
- **Fotos:** upload múltiplo com progresso, arrastar para ordenar (ou setas), “tornar capa”, ângulo, descrição (acessibilidade) e **ponto focal** (clique na foto) usado nos recortes. Metadados/GPS removidos; conversão para WebP; limite de 15 MB.
- **Giro 360°:** aba “Sequência 360°” para quadros reais fotografados em volta do carro, na ordem. O giro só aparece no site com **12 quadros ou mais**.
- **3D:** ver seção abaixo.
- **Usuários:** perfis *administrador* (gerencia usuários) e *editor* (gerencia veículos). O último administrador não pode ser removido.
- **Segurança:** sessões de 7 dias guardadas como hash, limite de 6 tentativas de login/15 min por e-mail e por IP, verificação de sessão em toda página/ação/rota, proteção de origem nos uploads, `noindex` no painel.

Veículo **vendido** sai da listagem, mas a página continua acessível com o aviso “vendido” e sugestões. Rascunhos retornam 404 no site.

## Visualização 3D por veículo

Cada veículo pode ter **um** modelo 3D, associado no painel por:

1. **Upload de `.glb`** (glTF 2.0 binário autocontido, até 40 MB — ajuste com `MODEL3D_MAX_MB`). O servidor valida cabeçalho, versão, integridade, JSON interno, extensões exigidas e ausência de arquivos externos; ou
2. **URL `https://` externa** (`.glb`/`.gltf`), aceita apenas de hosts autorizados (`MODEL3D_ALLOWED_HOSTS` + domínio público do bucket). O servidor verifica a disponibilidade e o tamanho antes de salvar. O host precisa liberar **CORS** para o domínio do site.

Para **ativar** o visualizador é obrigatório informar:
- **o que o modelo representa:** *digitalização deste veículo* ou *modelo ilustrativo licenciado* (o site então exibe o aviso de que pode não reproduzir cor, versão, rodas e estado do exemplar);
- **origem, autor e licença** (exibido discretamente junto ao visualizador).

Sem modelo ativo, o anúncio mostra só as fotos — **sem botão de 3D**. Poster opcional; sem ele, usa-se a capa do anúncio. É possível pré-visualizar antes de ativar, substituir (novo upload apaga o anterior) e remover.

No site: o Three.js e o modelo **só são baixados quando o visitante clica** em “Carregar visualização 3D”. Antes, o arquivo é verificado (HEAD). Arrastar gira (no celular, o gesto vertical continua rolando a página); pinça ou Ctrl/⌘ + roda aproximam; botões de aproximar/afastar/restaurar; teclado (setas, + −, 0). Zoom e inclinação são limitados pelo tamanho do modelo. Texturas acima de 2048 px (celular) / 4096 px (desktop) são reduzidas. Ao sair da aba 3D, geometrias, materiais, texturas, ambiente e o contexto WebGL são liberados. Sem WebGL ou em caso de erro, aparece uma mensagem com atalho para as fotos.

**Preparando modelos** (recomendado antes do upload):

```bash
npx @gltf-transform/cli optimize entrada.glb saida.glb --compress draco --texture-compress webp --texture-size 2048
```

> Não há modelos 3D dos veículos atuais. Não use modelos de terceiros sem licença comercial e nunca marque um modelo genérico como “digitalização deste veículo”.

## Deploy

**Opção A — servidor próprio/VPS (mais simples):** `STORAGE_DRIVER=local`, `DATABASE_URL=file:./data/bragatto.db`, disco persistente para `data/`. Rode `npm run build && npm run db:migrate && npm start` atrás de um proxy HTTPS (Nginx/Caddy). Faça backup da pasta `data/`.

**Opção B — Vercel (recomendada):** o disco da Vercel não é persistente, então o banco e as fotos ficam em serviços conectados pelo próprio painel:

1. **Banco:** no projeto da Vercel → *Storage* → *Create Database* → **Turso** (Marketplace) → conectar ao projeto. Isso cria `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN`.
2. **Fotos e 3D:** *Storage* → *Create* → **Blob** → conectar ao projeto. Isso cria `BLOB_READ_WRITE_TOKEN`.
3. **Primeiro acesso:** em *Settings → Environment Variables*, crie `ADMIN_EMAIL` e `ADMIN_PASSWORD` (mín. 10 caracteres; opcional `ADMIN_NAME`).
4. *Deployments* → **Redeploy**.

**Modo vitrine:** se o projeto for publicado na Vercel **sem** Turso e sem Blob, o build não falha: o site vai ao ar com o estoque inicial em modo somente leitura (banco empacotado no deploy, fotos estáticas) e o painel mostra que está desativado. Ao conectar Turso + Blob e fazer Redeploy, o modo completo é ativado automaticamente.

No build, o script `scripts/prebuild.ts` confere essas variáveis (e explica o que falta, se for o caso), aplica as migrações, carrega o **estoque inicial real uma única vez** (as fotos vão para o Blob) e cria o administrador se ainda não houver usuários. Depois do primeiro login, troque a senha em *Minha conta* e apague `ADMIN_PASSWORD` das variáveis.

`NEXT_PUBLIC_SITE_URL` é opcional na Vercel (usa o domínio de produção); defina quando tiver domínio próprio. Com Blob, o modelo 3D vai do navegador direto para o armazenamento (sem o limite de 4,5 MB das funções) e é validado no servidor antes de ser associado; fotos grandes são reduzidas no navegador antes do envio. Com R2/S3 na Vercel, o upload de GLB pelo painel fica limitado a ~4 MB — para arquivos maiores, use a opção de URL.

Nenhuma credencial vai para o navegador: todas as variáveis acima são lidas apenas no servidor (só `NEXT_PUBLIC_SITE_URL` é pública).

## Dados: o que é real e o que falta confirmar

O estoque inicial (`scripts/seed.ts`) veio das publicações do Instagram fornecidas:

| Veículo | Situação |
| --- | --- |
| Chevrolet Tracker Premier 1.2 Turbo 2023 | publicado · preço não informado (sob consulta) |
| Honda Civic EXS 1.8 2007/2008 | publicado · sob consulta |
| Chevrolet Onix LT 1.0 2013/2013 | publicado · sob consulta |
| Chevrolet Onix Sedan LTZ 1.0 Turbo 2024/2025 | publicado · sob consulta |
| Citroën C4 Cactus Feel Pack 1.6 2022 (R$ 84.900) | **rascunho** — fotos feitas em outra loja (Arsênio Veículos) |
| Ford Ka Sedan (branco) | **não cadastrado** — só há fotos, sem nenhum dado; fotos tratadas em `seed/photos/ka-*.jpg` |

Pontos para a loja confirmar (também anotados em “observações internas” de cada veículo no painel):
- disponibilidade, quilometragem atual e preços (as publicações são de julho/agosto);
- câmbio do Tracker e do Onix LT foi identificado pelas fotos (a legenda não informava);
- no Onix Sedan, a legenda cita “Direção” sem dizer o tipo;
- C4 Cactus: confirmar direito de uso das fotos ou substituir; combustível não informado;
- as legendas citam o endereço como “Lapa”; o site usa **Centro**, conforme o briefing;
- algumas legendas trazem outro número de WhatsApp — o site usa somente (67) 99130-5081;
- campos prontos para preencher em `src/config/site.ts`: CEP, horário de funcionamento, e-mail, CNPJ e coordenadas do mapa.

Tratamento de fotos (`scripts/prepare-assets.py`): placas de carros de terceiros ao fundo e molduras de placa de outra loja foram desfocadas; contadores/barras de captura de tela removidos; ajuste leve de contraste e nitidez. A aparência dos veículos não foi alterada.
