# BIPC - Benchmark Iterativo de Projetos de Baixo Carbono

<p align="center">
  <strong>Plataforma para benchmarking e análise de projetos de construção civil com foco em sustentabilidade e redução de emissões de carbono.</strong>
</p>

<p align="center">
  <a href="https://bipc.org.br">bipc.org.br</a>
</p>

---

## Visão Geral

O BIPC (Iterative Benchmark for Low-Carbon Projects) é uma plataforma web desenvolvida pela Benchmark-CO2 que permite a análise e comparação de projetos de construção civil quanto ao seu impacto ambiental. A ferramenta auxilia engenheiros, arquitetos e profissionais da construção a tomarem decisões mais sustentáveis através de métricas precisas de emissão de carbono.

## Funcionalidades

- **Gestão de Usuários** - Cadastro, autenticação e gerenciamento de perfis
- **Gestão de Projetos** - Criação e acompanhamento de projetos de construção
- **Módulos Estruturais** - Análise de diferentes tipos de estruturas:
  - Vigas e Pilares (Beam/Column)
  - Alvenaria Estrutural
  - Muro de Concreto
  - Fundações (Estacas, Radier, Radier com Estacas)
- **Benchmark** - Comparação de projetos com base de dados de referência
- **Convites** - Sistema de convites para colaboração
- **Exportação CSV** - Exportação de dados para análise externa
- **Métricas** - Acompanhamento de métricas da aplicação
- **API RESTful** - API documentada com OpenAPI 3.1

## Arquitetura

```
bipc/
├── cmd/api/           # Ponto de entrada da aplicação API
├── internal/          # Código interno da aplicação
│   ├── data/          # Camada de acesso a dados
│   ├── mailer/        # Serviço de envio de e-mails
│   ├── modules/       # Lógica dos módulos estruturais
│   ├── validator/     # Validação de dados
│   └── vcs/           # Controle de versão
├── web/
│   └── frontend/      # Frontend React
├── migrations/        # Migrações do banco de dados
├── zarf/
│   ├── compose/       # Docker Compose
│   └── docker/        # Dockerfiles
└── remote/            # Configurações de deploy
```

## Stack Tecnológico

### Backend
- **Linguagem**: Go 1.24
- **Banco de Dados**: PostgreSQL 17.5
- **Framework HTTP**: httprouter
- **Autenticação**: API Key + Bearer Token
- **Migrations**: golang-migrate

### Frontend
- **Framework**: React 19 com TypeScript
- **Build**: Vite
- **Roteamento**: TanStack Router
- **Estilização**: Tailwind CSS 4
- **UI Components**: Radix UI
- **State Management**: TanStack Query
- **Gráficos**: Recharts + D3.js
- **Formulários**: React Hook Form + Zod
- **Internacionalização**: i18next

### Infraestrutura
- **Containerização**: Docker + Docker Compose
- **Reverse Proxy**: Caddy
- **CI/CD**: GitHub Actions
- **Deploy**: Stage e Production (AWS EC2)

## Pré-requisitos

- [Go](https://golang.org/) >= 1.24
- [Node.js](https://nodejs.org/) >= 24.2.0
- [pnpm](https://pnpm.io/) >= 10.12.1
- [Docker](https://www.docker.com/) + Docker Compose
- [PostgreSQL](https://www.postgresql.org/) 17.5 (ou via Docker)
- gcc

### Navegadores Suportados

- Chrome >= 87
- Firefox >= 78
- Safari >= 14
- Edge >= 88

## Configuração

### Variáveis de Ambiente

Crie um arquivo `.envrc` na raiz do projeto com as seguintes variáveis:

```bash
export URL=http://localhost:4000
export DB_DSN=postgres://user:password@localhost/bipc?sslmode=disable
export SMTP_HOST=localhost
export SMTP_PORT=1025
export SMTP_USERNAME=
export SMTP_PASSWORD=
export SMTP_SENDER=noreply@bipc.org.br
```

### Instalação de Dependências

```bash
# Instalar ferramentas Go
make dev/gotooling

# Baixar imagens Docker necessárias
make dev/docker

# Instalar dependências do frontend
make build/frontend
```

## Execução

### Desenvolvimento

```bash
# Iniciar serviços (PostgreSQL, MailHog, etc.)
make compose/up

# Executar migrations
make migrations/up

# Iniciar a API
make run/api

# Desenvolvimento do frontend (em outro terminal)
cd web/frontend && pnpm dev
```

### Docker

```bash
# Build da imagem e iniciar serviços
make compose/build-up

# Visualizar logs
make compose/logs

# Parar serviços
make compose/down

# Parar e remover volumes
make compose/down-volume
```

## Banco de Dados

### Migrações

```bash
# Criar nova migration
make migrations/new name=nome_da_migration

# Aplicar todas as migrations
make migrations/up

# Reverter todas as migrations
make migrations/down

# Reverter última migration
make migrations/down-one
```

### Tabelas Principais

- `users` - Usuários do sistema
- `tokens` - Tokens de autenticação
- `projects` - Projetos de construção
- `roles` - Papéis/permissões
- `invitations` - Convites
- `units` - Unidades de medida
- `modules` - Módulos estruturais

## Build

```bash
# Build do frontend
make build/frontend

# Build da documentação API
make build/docs

# Build do backend
make build/api
```

Os binários são gerados em:
- `./bin/api` - Binário local
- `./bin/linux_amd64/api` - Binário Linux AMD64

## Deploy

### Stage

```bash
# Conectar ao servidor de stage
make stage/connect

# Deploy da API para stage
make stage/deploy/api
```

### Production

```bash
# Conectar ao servidor de produção
make production/connect

# Deploy manual
make production/deploy/api
```

### CI/CD

O deploy para produção é automatizado via GitHub Actions ao criar/editar uma release no GitHub.

## Controle de Qualidade

```bash
# Organizar dependências e formatar código
make tidy

# Executar verificações de qualidade
make audit
```

As verificações incluem:
- `go mod tidy -diff`
- `go mod verify`
- `go vet`
- `staticcheck`
- `govulncheck`

## API

A documentação da API está disponível em formato OpenAPI 3.1 em `openapi.yaml`.

Para gerar a documentação HTML:

```bash
make build/docs
```

A documentação será gerada em `web/frontend/dist/docs.html`.

### Autenticação

A API suporta dois métodos de autenticação:
- **API Key** - via header `X-API-Key`
- **Bearer Token** - via header `Authorization: Bearer <token>`

## Comandos Disponíveis

Execute `make help` para listar todos os comandos disponíveis:

```
Usage:
  help                print this help message
  dev/gotooling       install Go tooling for development
  dev/docker          pull all required Docker images for development
  docker/build        build the Docker image for the application
  compose/up          start the Docker Compose services
  compose/down        stop and remove the Docker Compose services
  compose/logs        view the logs of the Docker Compose services
  run/api             run the cmd/api application
  migrations/new      create a new database migration
  migrations/up       apply all up database migrations
  migrations/down     apply all down database migrations
  tidy                tidy, vendor module dependencies and format all .go files
  audit               run quality control checks
  build/frontend      build the frontend application
  build/api           build the cmd/api application
  build/docs          build the documentation
```

## Licença

Copyright © Benchmark-CO2. Todos os direitos reservados.
