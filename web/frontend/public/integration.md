# Guia de Integração com a API BIPC

## Requisitos Prévios

### Terminologia da Plataforma
Para melhor compreensão da integração, é importante entender os seguintes conceitos:

- **Projeto**: Representa um empreendimento completo (por exemplo, um condomínio com uma ou mais torres)
- **Unidade**: Representa uma unidade construtiva dentro do projeto (por exemplo, uma torre, um bloco, ou um edifício individual)
- **Módulo**: Representa os quantitativos de materiais de uma disciplina específica (estrutura, fundações, etc.) aplicados a um ou mais pavimentos da unidade

### Pré-requisitos
Na plataforma BIPC, o usuário já deve ter:
- Conta ativada
- Projeto(s) criado(s) com disciplinas configuradas
- Unidade(s) criada(s)

## Passo 1: Autenticação

O usuário deve obter sua **API Key** através da interface web da plataforma BIPC (disponível nas configurações da conta).

O software deve armazenar a chave de API fornecida pelo usuário e incluí-la em **todas as requisições** através do header:

```
X-API-Key: <chave-do-usuario>
```

**Base URL**: `https://app.bipc.org.br`

## Passo 2: Listar Projetos do Usuário

**Endpoint**: `GET /v1/projects`

**Query Parameters (opcionais)**:
- `page`: Número da página (padrão: 1)
- `page_size`: Tamanho da página (1-50, padrão: 20)
- `sort`: Ordenação (ex: `name`, `-created_at`)
- `name`: Filtrar por nome

**Resposta**:
```json
{
  "projects": [
    {
      "id": "uuid",
      "name": "Nome do Projeto",
      "state": "SP",
      "city": "São Paulo",
      "phase": "executive_project",
      "created_at": "2024-01-15T10:00:00Z",
      "units": [...]
    }
  ],
  "metadata": {
    "current_page": 1,
    "page_size": 20,
    "total_records": 5
  }
}
```

O software deve exibir a lista de projetos para o usuário selecionar.

## Passo 3: Obter Detalhes da Unidade

As informações básicas das unidades (id e nome) já vêm na resposta do GET `/v1/projects`. Após o usuário selecionar uma unidade, é necessário fazer uma request para carregar os detalhes completos, incluindo pavimentos e roles:

**Endpoint**: `GET /v1/projects/{projectID}/units/{unitID}`

**Resposta**:
```json
{
  "unit": {
    "id": "uuid",
    "project_id": "uuid",
    "name": "Torre Principal",
    "type": "tower",
    "floors": [
      {
        "id": "uuid",
        "index": 1,
        "category": "standard_floor",
        "area": 450.5,
        "height": 2.8,
        "floor_group": "Pavimentos Tipo"
      }
    ],
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  },
  "roles": [
    {
      "id": "uuid",
      "name": "Estrutura",
      "is_member": true
    },
    {
      "id": "uuid",
      "name": "Fundações",
      "is_member": false
    }
  ]
}
```

O software deve:
- Exibir a lista de unidades (vindas do GET /projects) para seleção
- Após seleção, fazer GET na unidade específica para obter detalhes completos
- Armazenar os IDs dos pavimentos (`floors[].id`) para usar no campo `floor_ids` ao criar módulos
- **Filtrar roles onde `is_member = true`** - a API já retorna apenas roles com `simulation = true`

### Alternativa: Obter Roles através de Collaborators

Como alternativa ao endpoint da unidade, é possível obter todos os roles do projeto através do endpoint de collaborators:

**Endpoint**: `GET /v1/projects/{projectID}/collaborators`

**Resposta**:
```json
{
  "data": {
    "roles": [
      {
        "id": "uuid",
        "project_id": "uuid",
        "name": "Estruturas",
        "description": "Projeto de Estrutura de Concreto Armado",
        "simulation": true,
        "is_protected": false,
        "permissions_ids": [2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        "users_ids": ["uuid-user-1", "uuid-user-2"]
      },
      {
        "id": "uuid",
        "project_id": "uuid",
        "name": "Administrador",
        "simulation": false,
        "is_protected": true,
        "permissions_ids": [1],
        "users_ids": ["uuid-user-1"]
      }
    ],
    "collaborators": [
      {
        "id": "uuid",
        "created_at": "2026-03-10T19:15:51Z",
        "name": "Nome do Usuário",
        "email": "usuario@example.com",
        "activated": true,
        "roles": ["Administrador", "Estruturas"]
      }
    ]
  }
}
```

**Observações sobre este endpoint**:
- Retorna **todos** os roles do projeto (não filtrados por unidade)
- O campo `simulation` indica se a role é uma disciplina de simulação
- O campo `users_ids` contém os IDs de todos os usuários que possuem essa role
- Para verificar se o usuário atual pode criar módulos, busque o ID do usuário no array `users_ids` da role desejada
- **Filtrar por `simulation = true`** para obter apenas as disciplinas relevantes para criação de módulos

## Passo 4: Criar Option

**Para evitar módulos duplicados**, o software deve criar uma nova option exclusiva para os módulos gerados:

**Endpoint**: `POST /v1/projects/{projectID}/units/{unitID}/roles/{roleID}/options`

**Body**:
```json
{
  "name": "Software XYZ - Exportação 2024-03-09",
  "active": true
}
```

**Resposta**: `201 Created`
```json
{
  "option": {
    "id": "uuid",
    "name": "Software XYZ - Exportação 2024-03-09",
    "active": true,
    "unit_id": "uuid",
    "role_id": "uuid"
  }
}
```

**Nota**: Criar uma nova option garante que os módulos exportados fiquem isolados, facilitando gerenciamento e evitando conflitos com módulos já existentes.

**Momento da Integração**: Os passos 4 e 5 devem ser executados automaticamente quando o usuário decidir sincronizar/exportar o projeto do software para a plataforma BIPC. Nesse momento, o software deve:
1. Criar a nova option
2. Criar todos os módulos necessários nessa option

## Passo 5: Criar Módulo

**Importante sobre pavimentos**: Um módulo pode ser aplicado a **múltiplos pavimentos** através do array `floor_ids`. Por exemplo, se um sistema estrutural é idêntico nos pavimentos 1 ao 10, você pode criar um único módulo com todos esses `floor_ids` ao invés de criar 10 módulos separados.

Com as informações coletadas, o software pode criar um módulo.

### Versões de API para criação

- **V2 (preferencial para novas integrações)**:
  - `POST /v2/projects/{projectID}/units/{unitID}/options/{optionID}/modules`
  - Usa o formato novo (`concrete`, `steel`, `form` com `position`)
- **V1 (legado, ainda funcional para compatibilidade)**:
  - `POST /v1/projects/{projectID}/units/{unitID}/options/{optionID}/modules`
  - Aceita o formato legado por tipo de módulo

Recomendação: implemente em **V2** por padrão. Use **V1** apenas quando precisar manter compatibilidade com payloads antigos.

### Quando usar `floor_ids` e quando usar `floor_index`

- Use `floor_ids` quando você já possui os IDs reais dos pavimentos e quer aplicar o módulo diretamente nesses pavimentos.
- Use `floor_index` apenas em payload **em lote** (`modules: []`) para módulos estruturais (`beam_column`, `concrete_wall`, `structural_masonry`).
- `floor_index` deve ser enviado dentro de `data` e não pode ser enviado junto com `floor_ids` no mesmo item.
- Em lote com `floor_index`, o backend resolve automaticamente o pavimento de destino com base na unidade e na ordem dos pavimentos.
- Para payload de módulo único, prefira sempre `floor_ids`.

### Criação em lote no mesmo endpoint

Os endpoints acima aceitam **dois formatos** de body:

- **Módulo único** (formato atual):
  - `{ "type": "...", "data": { ... } }`
- **Lista de módulos**:
  - `{ "modules": [ { "type": "...", "data": { ... } }, ... ] }`

Regra importante:

- Ao enviar `modules`, não envie `type` e `data` na raiz do payload.

### Exemplo V2 em lote (mesmo endpoint)

```json
{
  "modules": [
    {
      "type": "beam_column",
      "data": {
        "floor_index": 1,
        "concrete": [
          { "fck": 30, "volume": 21, "position": "column" }
        ],
        "steel": [
          { "material": "rebar", "resistance": "CA50", "mass": 43, "position": "column" }
        ]
      }
    },
    {
      "type": "piles_foundation",
      "data": {
        "unit_id": "uuid-da-unidade",
        "concrete": [
          { "fck": 30, "volume": 45.5, "position": "pile" }
        ],
        "steel": [
          { "material": "rebar", "resistance": "CA50", "mass": 450, "position": "pile" }
        ]
      }
    }
  ]
}
```

### Exemplo V1 em lote (mesmo endpoint)

```json
{
  "modules": [
    {
      "type": "beam_column",
      "data": {
        "floor_ids": ["uuid-pavimento-1"],
        "concrete_columns": {
          "volumes": [{ "fck": 25, "volume": 21 }],
          "steel": [{ "material": "rebar", "resistance": "CA50", "mass": 43 }]
        },
        "concrete_beams": {
          "volumes": [{ "fck": 30, "volume": 33 }],
          "steel": [{ "material": "rebar", "resistance": "CA50", "mass": 21 }]
        },
        "concrete_slabs": {
          "volumes": [{ "fck": 30, "volume": 11 }],
          "steel": [{ "material": "rebar", "resistance": "CA50", "mass": 22 }]
        }
      }
    },
    {
      "type": "concrete_wall",
      "data": {
        "floor_ids": ["uuid-pavimento-2"],
        "concrete_walls": {
          "volumes": [{ "fck": 30, "volume": 18 }],
          "steel": [{ "material": "rebar", "resistance": "CA50", "mass": 15 }]
        },
        "concrete_slabs": {
          "volumes": [{ "fck": 25, "volume": 12 }],
          "steel": [{ "material": "rebar", "resistance": "CA50", "mass": 10 }]
        }
      }
    }
  ]
}
```

### Exemplo V2 (preferencial) - Módulo Estrutural `beam_column`

```json
{
  "type": "beam_column",
  "data": {
    "floor_index": 2,
    "concrete": [
      {
        "fck": 25,
        "volume": 21,
        "position": "column"
      },
      {
        "fck": 30,
        "volume": 33,
        "position": "beam"
      },
      {
        "fck": 30,
        "volume": 11,
        "position": "slab"
      }
    ],
    "steel": [
      {
        "material": "rebar",
        "resistance": "CA50",
        "mass": 43,
        "position": "column"
      },
      {
        "material": "rebar",
        "resistance": "CA50",
        "mass": 21,
        "position": "beam"
      },
      {
        "material": "rebar",
        "resistance": "CA50",
        "mass": 22,
        "position": "slab"
      }
    ],
    "form": [
      {
        "area": 0,
        "position": "column"
      },
      {
        "area": 0,
        "position": "beam"
      },
      {
        "area": 0,
        "position": "slab"
      }
    ],
    "column_number": 10,
    "beam_number": 8,
    "slab_number": 5,
    "avg_beam_span": 0.51,
    "avg_slab_span": 0.5
  }
}
```

### Exemplo V1 (legado, ainda funcional) - Módulo Estrutural `beam_column`

```json
{
  "type": "beam_column",
  "data": {
    "floor_ids": ["uuid-pavimento-1", "uuid-pavimento-2"],
    "concrete_columns": {
      "volumes": [{ "fck": 25, "volume": 21 }],
      "steel": [{ "material": "rebar", "resistance": "CA50", "mass": 43 }]
    },
    "concrete_beams": {
      "volumes": [{ "fck": 30, "volume": 33 }],
      "steel": [{ "material": "rebar", "resistance": "CA50", "mass": 21 }]
    },
    "concrete_slabs": {
      "volumes": [{ "fck": 30, "volume": 11 }],
      "steel": [{ "material": "rebar", "resistance": "CA50", "mass": 22 }]
    }
  }
}
```

### Exemplo V2 (preferencial) - Módulo de Fundação `piles_foundation`

```json
{
  "type": "piles_foundation",
  "data": {
    "unit_id": "uuid-da-unidade",
    "concrete": [
      {
        "fck": 30,
        "volume": 45.5,
        "position": "pile"
      },
      {
        "fck": 30,
        "volume": 15.0,
        "position": "block"
      },
      {
        "fck": 30,
        "volume": 8.5,
        "position": "grade_beam"
      },
      {
        "fck": 30,
        "volume": 2.0,
        "position": "tie_beam"
      }
    ],
    "steel": [
      {
        "material": "rebar",
        "resistance": "CA50",
        "mass": 450.0,
        "position": "pile"
      },
      {
        "material": "rebar",
        "resistance": "CA50",
        "mass": 220.0,
        "position": "block"
      },
      {
        "material": "rebar",
        "resistance": "CA60",
        "mass": 40.0,
        "position": "block"
      },
      {
        "material": "rebar",
        "resistance": "CA50",
        "mass": 120.0,
        "position": "grade_beam"
      },
      {
        "material": "rebar",
        "resistance": "CA50",
        "mass": 40.0,
        "position": "tie_beam"
      }
    ]
  }
}
```

### Exemplo V1 (legado, ainda funcional) - Módulo de Fundação `piles_foundation`

```json
{
  "type": "piles_foundation",
  "data": {
    "fck": 30,
    "piles": {
      "volume": 45.5,
      "steel": [
        {
          "material": "rebar",
          "resistance": "CA50",
          "mass": 450.0
        }
      ]
    },
    "blocks": {
      "volume": 15.0,
      "steel": [
        {
          "material": "rebar",
          "resistance": "CA50",
          "mass": 220.0
        },
        {
          "material": "rebar",
          "resistance": "CA60",
          "mass": 40.0
        }
      ]
    },
    "grade_beams": {
      "volume": 8.5,
      "steel": [
        {
          "material": "rebar",
          "resistance": "CA50",
          "mass": 120.0
        }
      ]
    },
    "tie_beams": {
      "volume": 2.0,
      "steel": [
        {
          "material": "rebar",
          "resistance": "CA50",
          "mass": 40.0
        }
      ]
    },
    "unit_id": "uuid-da-unidade"
  }
}
```

### Regras rápidas por versão

- **V2** não aceita campos legados no payload (por exemplo: `concrete_columns`, `concrete_beams`, `concrete_slabs`, `fck`, `piles`, `blocks`, `grade_beams`, `tie_beams`, `wall_form_area`, `slab_form_area`, dependendo do tipo).
- **V1** não aceita campos do formato novo (`concrete`, `steel`, `form`) nos módulos legados correspondentes.
- Em caso de dúvida, padronize em V2 e envie apenas os campos do formato novo.

**Tipos de módulo disponíveis**:

**Módulos Estruturais** (usam campo `floor_ids`):
- `beam_column`: Sistema de vigas e pilares
- `concrete_wall`: Paredes de concreto
- `structural_masonry`: Alvenaria estrutural

**Módulos de Fundação** (usam campo `unit_id`):
- `raft_foundation`: Fundação em radier
- `piles_foundation`: Fundação em estacas
- `raft_piles_foundation`: Fundação mista (radier + estacas)

Observação: nos endpoints `/v1/.../units/{unitID}/.../modules` e `/v2/.../units/{unitID}/.../modules`, se `unit_id` não for enviado no `data` de módulos de fundação, a API usa automaticamente o `unitID` da URL.

**Resposta**: `201 Created` - Módulo criado com sucesso com cálculo de consumo (CO2 e energia)

- Para payload de **módulo único**, a resposta vem com chave `module`.
- Para payload em **lote**, a resposta vem com chave `modules`.

## Resumo do Fluxo

1. **Autenticar**: Usuário fornece chave de API
2. **Listar Projetos**: `GET /v1/projects` → usuário seleciona projeto e visualiza unidades disponíveis
3. **Obter Unidade**: Usuário seleciona uma unidade → `GET /v1/projects/{projectID}/units/{unitID}` → carrega floors e roles (apenas com `simulation = true`). Filtrar roles onde `is_member = true`
4. **Criar Option** (executado quando usuário decide sincronizar): `POST /v1/projects/{projectID}/units/{unitID}/roles/{roleID}/options` → criar nova option exclusiva para os módulos
5. **Criar Módulos** (executado quando usuário decide sincronizar): 
  - Criar todos os módulos na option criada usando **preferencialmente** `POST /v2/projects/{projectID}/units/{unitID}/options/{optionID}/modules`
  - O endpoint `POST /v1/projects/{projectID}/units/{unitID}/options/{optionID}/modules` continua funcional para compatibilidade
  - Enviar dados com `floor_ids` (estrutura) ou `floor_index` (estrutura em lote, sem `floor_ids`) ou `unit_id` (fundação)
  - Repetir para cada módulo diferente

## Valores Permitidos

### FCK (Resistência do Concreto)
`20, 25, 30, 35, 40, 45, 50` (MPa)

### Estrutura de Aço (Todos os Módulos)

**Material do Aço** (`material`):
- `general`: Geral
- `rebar`: Barras de armadura
- `mesh`: Telas
- `strand`: Cordoalhas
- `other`: Outros (requer campo adicional `other_name`)

**Resistência do Aço** (`resistance`):
- `CA50`: CA-50
- `CA60`: CA-60
- `CP190`: CP-190
- `other`: Outros (requer campo adicional `other_resistance` em MPa)

### Posições Permitidas no Formato Novo

- `beam_column` (campos `data.concrete[]`, `data.steel[]` e `data.form[]`): `column`, `beam`, `slab`, `stair`
- `concrete_wall` (campos `data.concrete[]`, `data.steel[]` e `data.form[]`): `wall`, `slab`, `stair`
- `structural_masonry` (campos `data.concrete[]`, `data.steel[]` e `data.form[]`): `column`, `beam`, `slab`, `stair`
- `piles_foundation` (campos `data.concrete[]` e `data.steel[]`): `pile`, `block`, `grade_beam`, `tie_beam`
- `raft_foundation` (campos `data.concrete[]` e `data.steel[]`): `raft`
- `raft_piles_foundation` (campos `data.concrete[]` e `data.steel[]`): `raft`, `pile`

## Observações Importantes

- Todos os IDs devem ser UUIDs válidos
- **Momento da sincronização**: Quando o usuário decidir sincronizar/exportar, o software deve criar a option e todos os módulos
- **Módulos Estruturais** usam campo `floor_ids` (array de IDs de pavimentos da unidade)
- **Um módulo pode abranger múltiplos pavimentos**: Use o array `floor_ids` para aplicar o mesmo módulo a vários pavimentos de uma vez
- **Módulos de Fundação** usam campo `unit_id` (ID da unidade). Se omitido, a API preenche com o `unitID` da URL
- **Versão recomendada**: prefira sempre os endpoints e payloads **V2** para novas integrações
- **Compatibilidade**: V1 permanece funcional para sistemas legados
- **Estrutura de aço unificada**: Todos os módulos agora usam os campos `material`, `resistance` e `mass` na estrutura de aço
- **Campos opcionais adicionais em módulos estruturais**: `beam_number` e `slab_number` também são aceitos
- **Formato novo por posição**:
  - `beam_column`: use `position` com `column`, `beam`, `slab` ou `stair`
  - `concrete_wall`: use `position` com `wall`, `slab` ou `stair`
  - `structural_masonry`: use `position` com `column`, `beam`, `slab` ou `stair`
- O campo `floor_ids` é obrigatório para módulos estruturais, exceto quando usar `floor_index` em itens de lote
- O campo `unit_id` é recomendado para módulos de fundação (quando omitido, a API usa o `unitID` da URL)
- **A API retorna apenas roles com `simulation = true`** - o software deve filtrar por `is_member = true` para exibir apenas roles nos quais o usuário pode criar módulos
- Volumes são em metros cúbicos (m³)
- Massas de aço são em quilogramas (kg)
- Áreas são em metros quadrados (m²)
- Comprimentos e vãos são em metros (m)
- A resposta inclui cálculo automático de consumo de CO2 e energia (em kg e MJ respectivamente)

## Tratamento de Erros

A API retorna códigos HTTP padrão:

- `200`: OK - Requisição bem-sucedida
- `201`: Created - Recurso criado com sucesso
- `400`: Bad Request - Requisição malformada
- `401`: Unauthorized - Autenticação necessária ou inválida
- `403`: Forbidden - Conta não ativada ou sem permissão
- `404`: Not Found - Recurso não encontrado
- `409`: Conflict - Conflito de edição
- `422`: Unprocessable Entity - Falha na validação
- `500`: Internal Server Error - Erro do servidor

**Formato de resposta de erro**:
```json
{
  "error": "Mensagem de erro detalhada"
}
```

ou

```json
{
  "error": {
    "field": "mensagem de erro específica do campo"
  }
}
```
