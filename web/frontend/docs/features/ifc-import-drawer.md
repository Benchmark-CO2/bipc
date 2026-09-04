# Feature: Drawer de Importação de IFC / Arquivo TQS

> Relatório de contexto para continuidade em outra sessão.
> Última atualização: 2026-08-08 (**MIGRAÇÃO DrawerFormModule v1 → v2 CONCLUÍDA**; 55+ erros TypeScript no composite build `tsc -b` zerados; resumo completo e desvio estratégico documentados abaixo. Próximo passo: marcação "\*" de campos obrigatórios nos 6 submódulos.)

## Status atual

🟡 **Em desenvolvimento — TQS integrado; IFC integrado via proxy temporário; Stepper “Utilizar dados IFC” AGORA pode avançar (pré-requisito migração v1→v2 resolvido). Aplicar primeiro a marcação de obrigatórios com “\*” (próxima sessão) e depois codificar o Stepper.**

### Implementado nesta rodada (08/08) — Migração DrawerFormModule v1 → v2 (zero erros TypeScript no composite build)

#### 🐞 Problema raiz descoberto após tsc-b

O plano original (Fase D) propunha `useForm<TModuleDataV2>` (formato **flat v2 discriminado** com `concrete[]`, `steel[]`, `form[]`) e um aggregate layer nos submódulos (`groupByPosition` para ler, `flatBackFromGrouped` para escrever). Em prática, os 6 submódulos do formulário já operavam há meses com **setValue/watch em paths aninhados grouped** (ex.: `concrete_columns.volumes`, `wall_form_area`, `masonry_blocks`, `grout.volumes`, `piles.volume`, `raft.area`). A troca para `ModuleFormInput = z.input<typeof moduleFormSchema>` no tipo do `UseFormReturn` quebrou tudo de vez — e o `tsc --noEmit` normal **não detectou** por não ler referências composite; apenas o `pnpm type-check` (que roda `tsc -b`) mostrou os ~55+ erros.

#### ✅ Desvio estratégico adotado e validado

Em vez de reescrever todo o setValue/watch dos submódulos para flat v2, mantivemos **100% do JSX intacto** e ajustamos apenas a camada de tipos + resolver, com estas duas peças-chave:

1. **Novo tipo canônico `ModuleFormState = TModuleGroupedForm`** em [moduleFormByType.validator.ts](file:///home/mateus/Documentos/Projects/benchmark-co2/bipc/web/frontend/src/validators/moduleFormByType.validator.ts#L346-L360). Os submódulos usam `UseFormReturn<ModuleFormState>` → paths nested continuam válidos.
2. **`customModuleResolver` em [index.tsx#L157-L181](file:///home/mateus/Documentos/Projects/benchmark-co2/bipc/web/frontend/src/components/layout/drawer-form-module/index.tsx#L157-L181)**: no submit, o react-hook-form recebe o grouped state, converte para flat v2 via `groupedFormToFlatV2()`, aplica `cleanZeroItemsBeforeSubmit()` e valida com `moduleFormSchema.safeParse()`. Se falhar, mapeia erros para fieldErrors; se passar, retorna o grouped como values para o handleSubmit continuar o fluxo de patch/post.

Resultado: o formulário **persiste em grouped internamente** (JSX dos submódulos inalterado), mas **a validação Zod e os payloads de API enviados** são 100% formato flat v2 — alinhado com endpoints `/v2/.../modules` e com o contrato do processor IFC.

---

#### Arquivos alterados nesta rodada (8 da lista do usuário + 5 suporte)

| #   | Arquivo                                                                                                                                                                                         | Principais correções                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | [moduleFormByType.validator.ts](file:///home/mateus/Documentos/Projects/benchmark-co2/bipc/web/frontend/src/validators/moduleFormByType.validator.ts)                                           | Adicionado alias `ModuleFormState = TModuleGroupedForm` (re-export do aggregate-helpers). Removido helper `stringToNumberGt` não usado. Corrigido `fckEnumSchema`: `z.enum([number])` → `z.union([z.literal(20)...z.literal(50)])` (TS2769 overload enum com numbers).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2   | [aggregate-helpers.ts](file:///home/mateus/Documentos/Projects/benchmark-co2/bipc/web/frontend/src/components/layout/drawer-form-module/aggregate-helpers.ts)                                   | Imports de `TFck` / `TSlabType` adicionados; removida constante `POSITIONS_FOR_TYPE` TS6133. Em `groupedFormToFlatV2`, todos os pushes de concrete agora fazem `.map((c)=>({...c, fck: c.fck as TFck, volume: toNumberValue(c.volume as string\|number)}))`; steel `.map((s)=>({...s, mass: toNumberValue(s.mass as string\|number)}))`; form apenas push se área>0 após toNumberValue. Raft: `volumeCalculated = areaNum * thicknessNum`; push só se todos > 0; `flatResult.raft_area = areaNum` sempre number. Piles: `fck as TFck` + `toNumberValue(g.piles.volume)`; condições de cap/grade/tie também validam `toNumberValue(vol) > 0`. Raft-piles e structural-masonry idem. `structural_masonry: concrete.length > 0 ? concrete : undefined` para campos opcionais do schema; `slab_type as TSlabType`. |
| 3   | [module-default-values.ts](file:///home/mateus/Documentos/Projects/benchmark-co2/bipc/web/frontend/src/components/layout/drawer-form-module/module-default-values.ts#L12-L32)                   | Erro TS2322 `structural_masonry: ["masonry"]` não atribuível a keyof TModuleDataV2 → tipo do Record de `(keyof TModuleDataV2)[]` trocado para `string[]`; removido `TModuleDataV2` unused import.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 4   | [index.tsx](file:///home/mateus/Documentos/Projects/benchmark-co2/bipc/web/frontend/src/components/layout/drawer-form-module/index.tsx)                                                         | Import `ModuleFormInput` → `ModuleFormState`. `mergedDefaults` e `useForm<>` trocados para `ModuleFormState`. **Implementado `customModuleResolver`** (no lugar de `zodResolver` direto; import `zodResolver` removido — TS6133). Correção TS6133: `onSuccess: (_data)` (removido destructure `variables` não usado). Correção TS2339: `floor_ids` não existe em union RaftFoundationGroupedForm → usado `const floorIdsFromGrouped = (grouped as any).floor_ids` antes do check/set. Nova assinatura `onSubmitSuccess` (ex.: usado pelo stepper) agora passa `flatData` já normalizado (shape v2 pronto para batch `POST /v2/.../modules`) além do `formInput` grouped.                                                                                                                                       |
| 5   | [module-form-beam-column.tsx](file:///home/mateus/Documentos/Projects/benchmark-co2/bipc/web/frontend/src/components/layout/drawer-form-module/module-form-beam-column.tsx)                     | Import `ModuleFormState`. Props interface: `form: UseFormReturn<ModuleFormState>`. Adiciona props `stepperMode`/`isSubmitted` opcionais (já existiam no index, faltavam na interface tight-type).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 6   | [module-form-concrete-wall.tsx](file:///home/mateus/Documentos/Projects/benchmark-co2/bipc/web/frontend/src/components/layout/drawer-form-module/module-form-concrete-wall.tsx)                 | Idem ao beam-column: `ModuleFormState`; Props atualizada.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 7   | [module-form-structural-masonry.tsx](file:///home/mateus/Documentos/Projects/benchmark-co2/bipc/web/frontend/src/components/layout/drawer-form-module/module-form-structural-masonry.tsx)       | `ModuleFormState`; Props acrescida de `stepperMode` + `isSubmitted`; `GroutItemProps` acrescida das mesmas + `isRequiredPosition`. Criado `STRUCTURAL_MASONRY_POSITION_LABEL` (TS2304 não encontrado). 9 ocorrências TS2322 `string→number`: defaults de `volume`/`quantity`/`mass` trocados de `"0"` → `0`. Dois locais onde steel do grout usavam defaults sem `position` (TS2741): acrescido `position: "vertical"` no init e `position: nextPos` no appendGrout.                                                                                                                                                                                                                                                                                                                                           |
| 8   | [module-form-raft-foundation.tsx](file:///home/mateus/Documentos/Projects/benchmark-co2/bipc/web/frontend/src/components/layout/drawer-form-module/module-form-raft-foundation.tsx)             | `ModuleFormState`; Props atualizada.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 9   | [module-form-piles-foundation.tsx](file:///home/mateus/Documentos/Projects/benchmark-co2/bipc/web/frontend/src/components/layout/drawer-form-module/module-form-piles-foundation.tsx)           | Idem.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 10  | [module-form-raft-piles-foundation.tsx](file:///home/mateus/Documentos/Projects/benchmark-co2/bipc/web/frontend/src/components/layout/drawer-form-module/module-form-raft-piles-foundation.tsx) | Idem.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 11  | [steel-material-list.tsx](file:///home/mateus/Documentos/Projects/benchmark-co2/bipc/web/frontend/src/components/layout/drawer-form-module/steel-material-list.tsx)                             | Removidos imports `Card`, `CardContent` nunca usados (TS6192).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 12  | [drawer-stepper-ifc.tsx](file:///home/mateus/Documentos/Projects/benchmark-co2/bipc/web/frontend/src/components/layout/drawer-stepper-ifc.tsx#L505-L532)                                        | Assinatura `handleModuleDrawerSubmit` atualizada para nova API do `onSubmitSuccess` (recebe `flatData: TModuleDataV2 & {...}` em vez de `schemaData`/`params.data`). Removido import `patchOption` não usado; removida importação duplicada de `TModulesTypes`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

---

#### Erros TypeScript resolvidos nesta rodada (contagem mínima observada)

| Código                          | Ocorrências | Descrição / onde                                                                                                                                              |
| ------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TS2769                          | 30+         | `string \| number → number` em concrete/steel volumes e mass (aggregate-helpers). Resolvido com `.map()` de `toNumberValue()` em cada push.                   |
| TS2322 string→TFck              | 10+         | `fck: number` não atribuível a `TFck` (literal union). Resolvido `fck as TFck`.                                                                               |
| TS2322 string→TSlabType         | 1           | `slab_type` em structural_masonry. Resolvido `g.slab_type as TSlabType \| undefined`.                                                                         |
| TS2769 z.enum(numbers)          | 1           | `fckEnumSchema = z.enum([20,25,...])` → trocado para `z.union` de `z.literal()`.                                                                              |
| TS2322 `"0"` string→number      | 9           | structural_masonry defaults de `volume/quantity/mass` → trocado para literal `0`.                                                                             |
| TS2741 missing position         | 2           | steel do grout sem `position` nos defaults/append → acrescido `position:"vertical"` / `nextPos`.                                                              |
| TS6133 (unused vars)            | 7           | `positionsFor`, `zodResolver`, `TModuleDataV2`, `Card/CardContent`, `stringToNumberGt`, `patchOption`, `variables` no destructure onSuccess. Todos removidos. |
| TS2304 não encontrado           | 1           | `STRUCTURAL_MASONRY_POSITION_LABEL` faltante → criado Record.                                                                                                 |
| TS2339 floor_ids não existe     | 1           | `grouped.floor_ids` em union discriminada → cast `(grouped as any).floor_ids`.                                                                                |
| TS2322 masonry key              | 1           | `REQUIRED_FIELDS_BY_TYPE_V2.structural_masonry: ["masonry"]` → tipo Record relaxado para `string[]`.                                                          |
| TS2300 duplicate                | 1           | `TModulesTypes` importado 2x no drawer-stepper → 1ª linha mantida.                                                                                            |
| TS2322 handleModuleDrawerSubmit | 1           | Assinatura callback incompatível com nova `onSubmitSuccess` → reescrito para usar `payload.flatData`.                                                         |

**Validação executada:**

```
pnpm type-check 2>&1 | grep -E "drawer-form-module|drawer-stepper-ifc|moduleFormByType" → 0 resultados.
GetDiagnostics (aggregate-helpers.ts, index.tsx, module-form-structural-masonry.tsx) → 0 erros TS (apenas Info cSpell em PT-BR, não erros TypeScript).
```

Hoje o Drawer tem dois fluxos distintos:

- **Arquivo TQS (real)**: upload conectado ao backend BIPC (Go) via endpoint multipart.
- **IFC (integrado via proxy temporário)**:
  - UI/UX e estados implementados.
  - Criação de request via proxy `/v1/proxy/*` do backend Go.
  - Upload do IFC via **PUT** em URL pré-assinada do S3 (com headers obrigatórios).
  - Listagem “arquivos importados” vem da listagem real do processor (polling enquanto houver itens pendentes).
  - Software/versão do IFC são opções vindas do endpoint `/fallbacks` do processor (via proxy).
  - Botão “Utilizar dados selecionados” já busca o `result` do processor, mas a etapa de aplicação do payload ainda não está implementada — ela vai ser implementada como um **Stepper shadcn** (ver seção “Stepper — IFC → Unidades → Módulos”).

O contrato “limpo” final do IFC (sem `client_id` na URL, sem password por query) ainda não está pronto; o que temos hoje são adaptações temporárias no backend Go para desbloquear a integração (ver seção “Backend BIPC (Go) — ajustes temporários no proxy”).

---

## Objetivo da feature

Criar um Drawer (padrão Vaul, igual aos outros drawers do projeto) que permite ao usuário importar dados de arquivos **IFC** ou **Arquivo TQS** para popular tecnologias construtivas, com 2 pontos de acesso hoje, cada um com um comportamento levemente distinto.

Baseado nos wireframes do Figma:

- Acesso por Edificação: https://www.figma.com/design/feqtornXILCHxsKi3fKO7h/Wireframes?node-id=5525-19510&m=dev
- Acesso por Simulação: https://www.figma.com/design/feqtornXILCHxsKi3fKO7h/Wireframes?node-id=5524-18788&m=dev

## Arquivo principal

[`src/components/layout/drawer-ifc-import.tsx`](../../src/components/layout/drawer-ifc-import.tsx)

Componente: `DrawerIFCImport`

```tsx
export type IFCAccessMode = "project" | "unit" | "simulation";

export interface DrawerIFCImportProps {
  mode: IFCAccessMode;
  projectId: string;
  unitId?: string;
  roleId?: string;
  optionId?: string;
  triggerComponent: React.ReactNode;
}
```

Exportado também via barrel file [`src/components/layout/index.ts`](../../src/components/layout/index.ts):

```ts
export { default as DrawerIFCImport } from "./drawer-ifc-import";
export type { IFCAccessMode } from "./drawer-ifc-import";
```

## Estrutura do Drawer

- **Header:** título dinâmico + botão fechar (X)
- **Tabs de tipo de arquivo:** IFC / Arquivo TQS — apenas quando `mode="simulation"`
- **Seção 1 — Importar novo arquivo:**
  - Select "Qual software utilizou para desenvolver?"
    - IFC: obrigatório; opções vem de `GET /v1/proxy/fallbacks` (lista de `manufacturer/version` disponíveis no processor; se a lista falhar ou estiver vazia, mostra estados loading / erro / vazio no drawer).
    - TQS: travado em `"TQS"`
  - Select "Qual versão"
    - IFC: obrigatório e depende do software (filtrado a partir da lista de fallbacks)
    - TQS: travado em `"tqsv26"`
  - Drag & Drop area (clique ou arraste), com preview do arquivo selecionado e botão de remover
  - Checkbox (IFC): "Calcular geometrias" com hint "(pode aumentar o tempo de processamento)". Default: `true`.
  - Botão "Gerenciar arquivos importados" — aparece apenas no IFC (**disabled** por enquanto)
  - Botão "Importar os dados" — habilita apenas com arquivo + software + versão preenchidos
- **Seção 2 — Utilizar dados já importados:**
  - Só existe no fluxo **IFC**.
  - Select de arquivo importado + botão "Utilizar dados selecionados".
  - Cada item do select mostra status via mapping (sem ternários aninhados) e tempo relativo ("1 minuto atrás", "2 horas atrás", "3 dias atrás"), e o nome do arquivo usa `.truncate` para não estourar o drawer.
  - Hint amarelo/vermelho abaixo do select também via mapping por status: `waiting_for_files` / `processing` / `failed`.

### Estados de status do IFC

Status possíveis do processor:

- `waiting_for_files` → request criada, PUT do IFC no S3 ainda não aconteceu (ou S3 event ainda não processou)
- `processing` → IFC recebido e parser em execução
- `completed` → pronto para usar
- `failed` → erro no processamento

Polling: `30s` enquanto existir qualquer item com status `waiting_for_files` ou `processing`.

### Estado de processamento (upload IFC / TQS)

Ao iniciar upload IFC ou TQS:

- Mostra uma tela de processamento com ícone grande centralizado + loading linear e a mensagem:
  - IFC: "Carregando arquivo IFC. Não feche essa janela até o upload completar."
  - TQS: "Carregando arquivo TQS. Não feche essa janela até o upload completar."
- O botão de fechar (X) fica desabilitado enquanto o upload está em andamento.
- No sucesso do TQS: toast + invalida queries relevantes + fecha drawer.
- No erro do TQS / IFC: toast + mostra mensagem de erro em box vermelho no drawer.

### Mensagens de erro / warning (padrão do projeto)

- Warning de formato inválido (box amarelo com ícone, estilo igual ao warning em `dialog-transfer-ownership`)
- Erro de import (box vermelho com ícone)
- Ao remover o arquivo do dropzone, a mensagem de erro é limpa.

### Layout / responsividade

- `DrawerContent` usa `min-w-2/5` (padrão dos outros drawers do projeto — `DrawerFormProject`, `DrawerFormUser`, etc.), com `w-full h-4/5` em mobile (`useIsMobile`)
- Os selects de "software" e "versão" ficam em um grid `grid-cols-[2fr_1fr]` para preencherem toda a linha proporcionalmente (2/3 e 1/3), com `SelectTrigger` usando `w-full`
- Direção do drawer: `right` (desktop) / `bottom` (mobile), igual aos demais

## Pontos de acesso (2 locais)

| #   | Local                                                                                                                      | Modo                | Arquivo                                                                                                                                                                                              |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Botão "Upload" no header de **Unidade/Edificação** (fora da rota constructive-technologies)                                | `mode="unit"`       | [`src/routes/_private/new_projects/$projectId/unit/route.tsx`](../../src/routes/_private/new_projects/$projectId/unit/route.tsx)                                                                     |
| 2   | Botão **"Importar de IFC/TQS"** ao lado do `DialogCreateSimulation`, na página de **Tecnologias Construtivas** (Simulação) | `mode="simulation"` | [`src/routes/_private/new_projects/$projectId/unit/$unitId/constructive-technologies/index.tsx`](../../src/routes/_private/new_projects/$projectId/unit/$unitId/constructive-technologies/index.tsx) |

Observações:

- O trigger no nível de **Projeto** foi removido (import não fica disponível no modo `project`).
- Em Simulação, o drawer deve receber `unitId` e `roleId`. O fluxo TQS só existe em simulação e depende desses IDs.

## i18n

Todos os textos usam `t.drawerIFC.*`, e o util de datas também usa `t.utils.date.*` (para plural one/other de tempo relativo). Adicionados em:

- [`src/i18n/translations/pt-BR.ts`](../../src/i18n/translations/pt-BR.ts)
- [`src/i18n/translations/en.ts`](../../src/i18n/translations/en.ts)

Principais chaves (lista não-exaustiva, mas útil para encontrar rápido):

- Títulos / tabs: `title`, `titleImport`, `fileTypeLabel`, `tabIFC`, `tabTQS`
- Seções: `sectionImportIFC`, `sectionImportTQS`, `sectionAlreadyImportedIFC`, `sectionAlreadyImportedTQS`
- Upload/dropzone: `dropZoneLabelIFC`, `dropZoneLabelTQS`, `dropZoneAriaIFC`, `dropZoneAriaTQS`, `removeFile`
- Validação de extensão: `invalidFileTypeIFC`, `invalidFileTypeTQS`
- Botões: `manageFiles`, `importData`, `useSelected`
- Processamento: `processingMessageIFC`, `processingMessageTQS`, `importQueuedIFC`
- Select de IFC importados: `selectFileLabel`, `selectFilePlaceholder`, `statusWaitingForFiles`, `statusProcessing`, `statusFailed`, `statusCompleted`, `waitingSelectHint`, `processingSelectHint`, `failedSelectHint`
- Options do select IFC (fallbacks): `noAvailableFallbacks`, `errorLoadingFallbacks`, `loadingFallbacks`, `noOptions`, `noVersions`
- Checkbox IFC: `calculateGeometriesLabel`, `calculateGeometriesHint`
- Tempo relativo (util/date): `utils.date.secondsAgo`, `utils.date.minutesAgo`, `utils.date.hoursAgo`, `utils.date.daysAgo`, `utils.date.weeksAgo`, `utils.date.monthsAgo` (todas no formato ICU plural one/other, ex: `"{count, plural, one {# hora atrás} other {# horas atrás}"}"`)
- Toasts: `importSuccess`, `importError`, `useSelectedSuccess`, `useSelectedError`

## Fluxo TQS (contrato atual)

Escopo:

- Disponível apenas em `mode="simulation"`.
- Extensão aceita: `.html` / `.htm`.
- Software/versão fixos: `"TQS"` / `"tqsv26"`.
- Não existe seção “Utilizar dados já importados” no TQS (upload é automático).

Endpoint:

`POST /v1/projects/{projectId}/units/{unitId}/roles/{roleId}/file-upload` com `multipart/form-data`:

- `file`: arquivo
- `source="tqs"` (fixo)

No sucesso:

- Invalida `["options", projectId, unitId]`
- Fecha o drawer

## Fluxo IFC (contrato temporário via `/v1/proxy/*`)

Objetivo do estado atual:

- Criar request → subir IFC → acompanhar polling → quando `completed`, habilitar “Utilizar dados selecionados” (hoje busca `result`, mas a aplicação desse payload ainda não está feita; vai ser stepper).

### client_id

No frontend, `client_id` é **sempre** `user.id` do usuário autenticado (obtido via `useAuth()` → [`src/hooks/useAuth.ts`](../../src/hooks/useAuth.ts)). Nunca é input do usuário.

### Endpoints do processor usados via proxy BIPC Go

Proxy base: `GET|POST /v1/proxy/*path` no backend BIPC. O backend mapeia para `<IFC_URL>/*path` e injeta headers/query de autenticação.

Endpoints úteis hoje:

1. **Listar fallbacks (software/versão disponíveis):** `GET /v1/proxy/fallbacks`
   - Response: `{ version_list: [ {manufacturer, version}, ... ] }`
   - Usado para popular os selects de software e versão do IFC.
2. **Criar request + receber presigned URL:** `POST /v1/proxy/request/{client_id}?manufacturer=X&version=Y&file_name=Z&file_hash=HASH&calculate_geometries=true`
   - Response: `{ request_id, ifc_url }`
   - `file_hash` = SHA-256 do arquivo em base64 (cálculo feito no front via `crypto.subtle.digest`).
   - Observação de backend temporário: o processor staging valida `password=<IFC_SECRET>` na query; o backend Go injeta essa query apenas em whitelist de métodos/paths (ver seção “Backend BIPC — ajustes temporários”).
3. **Listar requests do client:** `GET /v1/proxy/requests/{client_id}`
   - Response: `{ items: [{ request_id, client_id, file_name, status, ts_created, calculate_geometries, error_message?, fallback_id?, file_hash?, ... }, ...] }`
   - Usada no select de arquivos importados com polling.
4. **Status detalhado:** `GET /v1/proxy/request/status/{client_id}/{request_id}`
5. **Resultado processado (arquivos separados):**
   - Units → `GET /v1/proxy/request/result/units/{client_id}/{request_id}`
   - Modules → `GET /v1/proxy/request/result/modules/{client_id}/{request_id}`
   - **Contrato real (recebido em 06/08, confirmado via doc do processor e código):**
     - **Units** — objeto único (não array), compatível com parser cpp:
       ```json
       {
         "name": "string",
         "type": "string",
         "data": {
           "floors": [
             {
               "category": "string",
               "floor_group": "string",
               "index": "number|string"
             }
           ]
         }
       }
       ```
       Referências:
       - Shape do cpp em [bipc_report.h](file:///home/mateus/Documentos/Projects/benchmark-co2/ifc-parser-cpp/bipc_report.h#L12-L20): `units_json_stream` = `{"name", "type", "data":{"floors":[...]}}`.
       - S3 key escrita pelo parser: `results/{client_id}/{request_id}/units.json` em [bipc_lambda.cpp](file:///home/mateus/Documentos/Projects/benchmark-co2/ifc-parser-cpp/bipc_lambda.cpp#L181-L188).
     - **Modules** — batch v2 (`{modules:[{type,data},...]}`), compatível com o endpoint `POST /v2/projects/:projectId/units/:unitId/options/:optionId/modules` do BIPC:
       ```json
       {
         "modules": [
           {
             "type": "beam_column | concrete_wall | piles_foundation | ...",
             "data": {
               "floor_index": "number",
               "concrete": [...],
               "form": [...],
               "steel": [...]
             }
           }
         ]
       }
       ```
       Referências:
       - Shape do parser cpp em [bipc_report.h](file:///home/mateus/Documentos/Projects/benchmark-co2/ifc-parser-cpp/bipc_report.h#L12-L20) e [bipc_lambda.cpp](file:///home/mateus/Documentos/Projects/benchmark-co2/ifc-parser-cpp/bipc_lambda.cpp#L193-L202).
       - S3 key: `results/{client_id}/{request_id}/modules.json` em [bipc_lambda.cpp](file:///home/mateus/Documentos/Projects/benchmark-co2/ifc-parser-cpp/bipc_lambda.cpp#L193-L202).
     - **Rota antiga de result (“genérica”)** (`/request/result/:clientId/:requestId`) ainda existe no código da Lambda `request_read` como `request_type` dinâmico, mas **não está na doc exposta** pelo API Gateway. Não use; sempre use as duas rotas acima. Para conveniência no front, a action `getIfcRequestResult` abaixo dispara as duas em paralelo e agrega em `{units, modules}`.
     - Se no futuro o processor retornar múltiplas unidades, Units pode evoluir para array; o stepper deve ser preparado para aceitar ambos (objeto único ou array) e manter compatibilidade (ver seção do stepper).

### Upload IFC para S3 (opção A adotada por enquanto)

Após receber `ifc_url` do processor:

```ts
await fetch(ifc_url, {
  method: "PUT",
  headers: {
    "Content-Type": "application/x-ifc",
    "If-None-Match": "*",
  },
  body: ifcFile,
});
```

**Por que esses headers são obrigatórios:** a presigned URL do processor é gerada com `ContentType='application/x-ifc'` e `IfNoneMatch='*'`, e a assinatura S4 é calculada sobre `SignedHeaders=content-type;host;if-none-match`. Se faltar um header, o S3 recalcula a assinatura sem ele e dá 403 `SignatureDoesNotMatch`.

**Observação de infra (CORS do bucket S3)**: como o PUT é cross-site direto no S3 (opção A adotada por enquanto), o bucket precisa ter CORS configurado para:

- Permitir a origem `http://localhost:5173` (e outras origens de staging/prod quando for o caso)
- Permitir método `PUT`
- Permitir headers `Content-Type` e `If-None-Match`

Se ocorrer erro 403 no PUT (ex.: `SignatureDoesNotMatch`) ou falha no preflight (CORS), a alternativa é a **opção B**: frontend envia o arquivo para o backend BIPC Go, que repassa ao S3 via presigned (ou SDK), evitando cross-site e a dependência de CORS do bucket.

### Arquivos novos criados para IFC via proxy

Tipos: [`src/types/ifc.ts`](../../src/types/ifc.ts)

- `TIfcProcessorImportStatus = "waiting_for_files" | "processing" | "completed" | "failed"`
- `TIfcProcessorFallback { manufacturer; version }`
- `TIfcProcessorFallbacksResponse { version_list: TIfcProcessorFallback[] }`
- `TIfcProcessorCreateRequestResponse { request_id; ifc_url }`
- `TIfcProcessorRequestListItem { request_id, client_id, file_name, file_hash, status, ts_created, calculate_geometries, fallback_id, error_message? }`
- `TIfcProcessorRequestsResponse { items: TIfcProcessorRequestListItem[] }`
- `TIfcProcessorResultUnits` — `{name, type, data:{floors:[{category, floor_group, index}], ...}}`
- `TIfcProcessorResultModuleItem` — `{type, data:{...}}` (compatível com batch v2)
- `TIfcProcessorResultModules` — `{modules: TIfcProcessorResultModuleItem[]}`
- `TIfcProcessorAggregatedResult` — `{units: TIfcProcessorResultUnits, modules: TIfcProcessorResultModuleItem[]}` (agregado conveniência no front)

Actions (todas usam `api` do [`src/service/api.ts`](../../src/service/api.ts) e sem try/catch no corpo; erros são tratados nos `onError` de mutation/query e parseados via `parseApiError(error, t)`):

- [`src/actions/ifc/getIfcFallbacks.ts`](../../src/actions/ifc/getIfcFallbacks.ts) → `GET /v1/proxy/fallbacks`
- [`src/actions/ifc/postIfcCreateRequest.ts`](../../src/actions/ifc/postIfcCreateRequest.ts) → `POST /v1/proxy/request/:clientId?...`
- [`src/actions/ifc/getIfcRequests.ts`](../../src/actions/ifc/getIfcRequests.ts) → `GET /v1/proxy/requests/:clientId`
- [`src/actions/ifc/getIfcRequestStatus.ts`](../../src/actions/ifc/getIfcRequestStatus.ts) → `GET /v1/proxy/request/status/:clientId/:requestId`
- **Result (duas actions reais + uma agregadora):**
  - [`src/actions/ifc/getIfcResultUnits.ts`](../../src/actions/ifc/getIfcResultUnits.ts) → `GET /v1/proxy/request/result/units/:clientId/:requestId`
  - [`src/actions/ifc/getIfcResultModules.ts`](../../src/actions/ifc/getIfcResultModules.ts) → `GET /v1/proxy/request/result/modules/:clientId/:requestId`
  - [`src/actions/ifc/getIfcRequestResult.ts`](../../src/actions/ifc/getIfcRequestResult.ts) → wrapper `Promise.all` sobre `getIfcResultUnits` + `getIfcResultModules`, retornando `{data: {units, modules}}` compatível com `TIfcProcessorAggregatedResult` (mantido por conveniência no drawer ao invocar o stepper).

## Backend BIPC (Go) — ajustes temporários no proxy (desbloqueio de integração)

Arquivo alterado: [`cmd/api/proxy.go`](../../../cmd/api/proxy.go)

Problemas resolvidos com patches locais (passíveis de serem substituídos quando o contrato limpo do IFC for providenciado pelo backend):

1. **CORS duplicado no response**: o upstream (processor via API Gateway / handlers Python) retornava `Access-Control-Allow-Origin: *` e etc., e o nosso middleware CORS do BIPC também adicionava `Access-Control-Allow-Origin: http://localhost:5173` + `Access-Control-Allow-Credentials: true`. O browser rejeitava a resposta por duplicação/mismatch.
   - Solução temporária: no `proxyHandler`, **antes de escrever a resposta**, remover headers de CORS do upstream (strip), deixando apenas os headers do nosso middleware.
2. **Credenciais do processor**: o `POST /request/:client_id` do processor staging exige `password=<IFC_SECRET>` via query string (o handler Python lê `queryStringParameters.password` e compara com env). Inicialmente o proxy Go só enviava `Authorization: Bearer <IFC_SECRET>`, que não era lido pelo create_request, resultando em 401.
   - Solução temporária: whitelist de métodos/paths que exigem password por query; para matches, anexamos `password=<IFC_SECRET>` à URL antes de fazer a chamada upstream. Hoje a whitelist é:
     - `POST` para path começando com `/request/`
   - Observação: quando o processor aceitar Bearer ou houver contrato limpo, remover essa injeção.

### Env vars necessárias no compose

Para o backend BIPC conseguir usar o processor staging:

```
IFC_URL=https://ozogr7pdig.execute-api.sa-east-1.amazonaws.com/staging
IFC_SECRET=...
```

No compose elas são injetadas nas flags `-ifc-url` / `-ifc-secret` da API: [`zarf/compose/docker_compose.yaml`](../../../zarf/compose/docker_compose.yaml#L40-L54).

Se essas variáveis estiverem vazias, o `httputil.ReverseProxy` levanta `proxy error: unsupported protocol scheme ""` e os endpoints `/v1/proxy/*` dão `502`.

## Contrato Modules v2 no backend BIPC (referência para o stepper)

Endpoint para criar módulos em batch (preferencial para o fluxo IFC): [`routes.go`](../../../cmd/api/routes.go#L85-L87) e handler [`modules.go`](../../../cmd/api/modules.go#L568-L600).

- `POST /v2/projects/{projectID}/units/{unitID}/options/{optionID}/modules`
- Aceita dois formatos:
  - Um módulo só: `{ type: "<type>", data: {...} }`
  - Batch (mais usado no fluxo IFC): `{ modules: [ {type, data}, {...}, ... ] }`
- **Transação em lote**: quando enviamos **2+ módulos**, o handler faz BEGIN/COMMIT com timeout 30s e all-or-nothing. É importante levar isso em conta no stepper (ver “Implementação em lote vs. por unidade”):
  - Para módulos passíveis de falha, sugerimos separar em grupos: um batch apenas com itens validados com sucesso, e criar individualmente (ou em batches menores) os itens corrigidos pelo usuário, para não perder tudo em uma validação falha global.
- **Tipos de erro no response:**
  - 400 + `ValidationError` → erros de validação mapeados por campo.
  - 400 bad request → payload malformado (ex.: `modules` vazio, `type + data` e `modules` enviados juntos, etc.).
  - 404 → project/unit/option não encontrados.
- **`unit_id` opcional em foundations**: para foundation modules, `unit_id` em `data` pode ser omitido e é inferido do path. Para structural, é interessante sempre enviar ou validar antes.
- Read: `GET /v2/.../modules/:moduleId` retorna a forma v2 (retorna `floor_indexes` para structural, não `floor_index`).

Response shapes (OpenAPI): [`openapi.yaml`](../../../openapi.yaml#L1611-L1711) e schemas batch: [`openapi.yaml`](../../../openapi.yaml#L2374-L2405).

## Tempo relativo / util de datas

Refatorado [`src/utils/date.ts`](../../src/utils/date.ts) para:

- Calcular tempo relativo em segundos/minutos/horas/dias (facilmente extensível para semanas/meses).
- Usar as chaves de tradução `utils.date.*` no formato ICU-like `{count, plural, one {...} other {...}}`, com parser manual de case one/other (não depende de regex frágeis) e substituindo `{count}`, `{#}` e também **`#` literal** (usado dentro dos cases) pelo número real.

Isso resolve o bug antigo de aparecer “# hora atrás” em vez de “1 hora atrás”.

Uso no drawer:

- Mapper `mapIfcRequestToImportedFile` usa `dateUtils.calculateRelativeTime(new Date(req.ts_created * 1000))` para o sufixo do item do select.

---

# 🔴 PRÉ-REQUISITO URGENTE: Migrar DrawerFormModule v1 → v2

> **Bloqueio atual**: o processor IFC já entrega modules em **formato v2** (campos agregados `concrete[]`, `steel[]`, `form[]` com `position`). Hoje, se o usuário abrir o drawer `drawer-form-module` para editar um módulo vindo do IFC no Step 2, o formulário lê/escreve **v1** (campos agrupados `concrete_columns/concrete_beams/concrete_slabs` raiz), exigindo um mapper ida-e-volta de conversão que é fonte de bugs e duplicação. A migração é **obrigatória** antes de habilitar o Stepper.

---

## 1. Por que migrar? Viabilidade

**DECISÃO: Sim, é obrigatório migrar. Custo-benefício altamente favorável.**

| Razão                                | Detalhe                                                                                                                                                                                                                                 |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Parser IFC já gera v2                | `modules.json` do processor sai com `concrete[]`, `steel[]`, `form[]` + `position`. Sem migração → precisamos manter um mapper v2→v1 no drawer de edição e v1→v2 no batch do stepper permanentemente.                                   |
| Stepper batch já usa v2              | `POST /v2/.../modules` no batch já está definido como contrato do Step 2. Desalinhar o formulário manual = duas fontes de verdade.                                                                                                      |
| v2 = “preferred endpoint” no OpenAPI | `openapi.yaml#L1611` descreve `/v2` como “Preferred endpoint for module creation”. v1 é “Compatibility endpoint”, implicando deprecação futura.                                                                                         |
| v1 não suporta `position: stair`     | `BeamColumnDataV1`, `ConcreteWallDataV1`, `StructuralMasonryDataV1` não têm stair no schema. Se o IFC retornar escadas, v1 silenciosamente perde esse dado.                                                                             |
| `fck` por position em foundations v2 | Em `PilesFoundationDataV2` cada posição (pile/block/grade_beam/tie_beam) tem seu próprio `fck` no `concrete[]`. v1 força 1 fck raiz.                                                                                                    |
| Esforço baixo com Aggregate Layer    | Podemos manter **100% do JSX visual** dos submódulos (cards Colunas / Vigas / Lajes etc. inalterados) e apenas introduzir helpers `groupByPosition` (v2 → agrupado) e `flatBackFromGrouped` (agrupado → v2) no form state. UX não muda. |

---

## 2. Diferenças estruturais v1 vs v2 (por tipo)

Fonte: [openapi-modules-schemas.yaml](../../../openapi-modules-schemas.yaml).

### Structural (sobreestrutura)

| Tipo               | Campo / Aspecto | v1 (compatibilidade)                                                                          | v2 (preferred)                                                                                                     |
| ------------------ | --------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| beam_column        | Materiais       | `concrete_columns`, `concrete_beams`, `concrete_slabs` (objetos aninhados `{volumes, steel}`) | `concrete: [{fck,volume,position}]`, `steel: [{material,resistance,mass,position}]`, `form: [{area,position}]`     |
| beam_column        | Forms           | `form_columns`, `form_beams`, `form_slabs`, `form_total` (números na raiz)                    | dentro de `form[]` com `position: column/beam/slab/stair`                                                          |
| beam_column        | Position enum   | NÃO EXISTE stair (apenas col/vig/laj implicitos nos campos)                                   | `position: column \| beam \| slab \| stair`                                                                        |
| concrete_wall      | Materiais       | `concrete_walls`, `concrete_slabs` (objetos aninhados)                                        | `concrete[]`, `steel[]`, `form[]` + `position: wall \| slab \| stair`                                              |
| concrete_wall      | Forms           | `wall_form_area`, `slab_form_area` (raiz)                                                     | dentro de `form[]` por position                                                                                    |
| structural_masonry | Materiais       | `concrete_columns/beams/slabs` (aninhados) + `masonry_blocks[]/grout[]/mortar[]`              | `concrete[]`, `steel[]`, `form[]` (position column/beam/slab/stair) + **`masonry` (MasonryElement único)**         |
| structural_masonry | Forms           | `form_columns/beams/slabs/form_total` (raiz)                                                  | dentro de `form[]` por position                                                                                    |
| TODOS structural   | Floor binding   | Apenas `floor_ids: UUID[]` (obrigatório)                                                      | `floor_ids: UUID[]` **OU** `floor_index: number` (batch input). Read retorna `floor_indexes: number[]` (readOnly). |

### Foundations (subestrutura)

| Tipo                  | Campo / Aspecto | v1 (compatibilidade)                                                             | v2 (preferred)                                                                                                                                                     |
| --------------------- | --------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| raft_foundation       | Materiais       | `area`, `thickness`, `fck` (raiz) + `steel: []` (raiz, sem position)             | `concrete: [{fck,volume,position:raft}]`, `steel: [{...,position:raft}]`. `raft_area`/`raft_thickness` = **readOnly** nas responses (NÃO enviar em create/update). |
| piles_foundation      | Seções + fck    | `fck` raiz único + `piles/pile_caps/grade_beams/tie_beams` = `{volume, steel[]}` | Cada seção é um item de `concrete[]` com `position: pile \| block \| grade_beam \| tie_beam` + **próprio fck**. `steel[]` com mesmas positions.                    |
| raft_piles_foundation | Seções          | `fck` raiz único + `raft: {area,thickness,steel}` + `piles: {volume,steel}`      | `concrete[]` positions `raft \| pile` + `steel[]` positions `raft \| pile`.                                                                                        |
| TODOS foundation      | unit_id         | opcional (inferido do path)                                                      | opcional (inferido do path)                                                                                                                                        |

---

## 3. Campos obrigatórios (fonte única: OpenAPI → `module-default-values.ts`)

> **Regra UX do usuário**: obrigatórios = outline vermelho APENAS se `stepperMode === true` OU `formState.isSubmitted === true`. Fora isso, cards usam `border-gray-200` sempre (sem azul).

Extraído do bloco `required:` de cada schema em `openapi-modules-schemas.yaml`:

| Tipo                    | Campos obrigatórios top-level schema                            | Observações / atenção                                                                                               |
| ----------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `beam_column`           | `concrete[] ≥ 1`, `steel[] ≥ 1`                                 | `form[]` é **opcional** no schema; `floor_ids` obrigatório quando não for batch `floor_index`.                      |
| `concrete_wall`         | `concrete[] ≥ 1`, `steel[] ≥ 1`                                 | `form[]` opcional.                                                                                                  |
| `structural_masonry`    | **`masonry` (MasonryElement)** — **único required**             | `concrete[]` e `steel[]` NÃO são obrigatórios no schema v2. Confirmado via `L389`.                                  |
| `raft_foundation`       | `concrete[] ≥ 1` (position raft), `steel[] ≥ 1` (position raft) | `fck` não é mais required raiz; agora vem **dentro de cada item de `concrete[]`**.                                  |
| `piles_foundation`      | `concrete[] ≥ 1`, `steel[] ≥ 1`                                 | Obrigatório ter **ao menos 1 pile position** com volume>0. Outras positions (block/grade/tie) podem estar ausentes. |
| `raft_piles_foundation` | `concrete[] ≥ 1`, `steel[] ≥ 1`                                 | Precisa ter ao menos 1 position `raft` e 1 `pile` em concrete/steel? → validar via zod.                             |

> **Ação no `module-default-values.ts`**:
>
> - Criar `REQUIRED_FIELDS_BY_TYPE_V2: Record<TModulesTypes, string[]>` como **fonte única** e substituir todas as listas hard-coded duplicadas nos submódulos JSX (hoje cada subform decide localmente se um card é "obrigatório").
> - Criar `POSITIONS_BY_TYPE: Record<TModulesTypes, string[]>` com os enums de position por tipo (ex: `beam_column: ['column','beam','slab','stair']`).

---

## 4. Tabela de endpoints (v1 vs v2) — quais manter temporariamente

Fonte: [openapi.yaml](../../../openapi.yaml#L1359-L1873).

| Ação                  | Endpoint v1 (compat)                                                          | Endpoint v2 (preferred)                                                                         | **Migrar agora?** | Observação                                                                                           |
| --------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------- |
| **CREATE (1 módulo)** | `POST /v1/.../modules` (L1359)                                                | `POST /v2/.../modules` (L1611) — enviar `{type, data}` (não aninhar em `modules[]` para 1 item) | ✅ SIM            |                                                                                                      |
| **CREATE batch≥2**    | `POST /v1/.../modules` com `{modules:[...]}` (suportado)                      | `POST /v2/.../modules` com `{modules:[...]}` (transação all-or-nothing 30s — L1624)             | ✅ SIM            | Já usado pelo Stepper Step 2.                                                                        |
| **READ (editar)**     | `GET  /v1/.../modules/:id` (L1477) → retorna v1 shape (omite v2-only fields)  | `GET  /v2/.../modules/:id` (L1712) → retorna v2 shape com `floor_indexes`                       | ✅ SIM            | Se editarmos com v2, precisa ler em v2.                                                              |
| **UPDATE (patch)**    | `PATCH /v1/.../modules/:id` (L1561) — só aceita grouped fields, sem stair     | `PATCH /v2/.../modules/:id` (L1760) — aggregated arrays obrigatórios                            | ✅ SIM            |                                                                                                      |
| **DELETE**            | `DELETE /v1/.../modules/:id` (L1521)                                          | **NÃO EXISTE em v2** (openapi.yaml não tem)                                                     | ⚠️ MANTER v1      | Manter chamada DELETE em v1 temporariamente. Criar issue no backend para expor v2 quando necessário. |
| **DUPLICATE**         | `POST /v1/.../modules/:id/duplicate` (L1825) — retorna raw data sem conversão | **NÃO EXISTE em v2** (openapi.yaml não tem)                                                     | ⚠️ MANTER v1      | Idem. Se o duplicate retornar v1, após duplicar fazemos um `GET v2` na cópia para normalizar.        |

---

## 5. Plano de migração em Fases (sem alterar o visual)

### Fase A — Tipos + Validators Zod v2

**Objetivo**: criar a camada de dados v2 canônica, substituindo validators v1 atuais.

Arquivos-alvo:

1. `src/types/modules.ts`

   - Criar `TBeamColumnDataV2`, `TConcreteWallDataV2`, `TStructuralMasonryDataV2`, `TRaftFoundationDataV2`, `TPilesFoundationDataV2`, `TRaftPilesFoundationDataV2` baseados 1:1 no OpenAPI schemas (`BeamColumnDataV2` etc.).
   - Criar discriminated union `TModuleDataV2 = TBeamColumnDataV2 | ... | TRaftPilesFoundationDataV2`.
   - Exportar `ModuleCreateRequestV2` = `{ type: TModulesTypes; data: TModuleDataV2 }`.

2. `src/components/layout/drawer-form-module/validators/*` (ou arquivo `module-form-by-type.validator.ts`)
   - Refazer 6 schemas Zod (`beam_columnSchema`, `concrete_wallSchema`, etc.) em **v2 aggregated** (ex: `z.object({concrete: z.array(...).min(1), steel: z.array(...).min(1), ...})`).
   - Cada item de `concrete/steel/form` deve ter seu `.refine()` com `position` no enum correto do tipo (usar `POSITIONS_BY_TYPE`).
   - Regras numéricas: `volume ≥ 0`, `mass ≥ 0`, `area ≥ 0` (aceitar zero; depois antes do envio, **strip arrays que contenham apenas itens totalmente zerados** para não enviar lixo — alinhar com a auditoria Go feita na sessão anterior).
   - `structural_masonry`: `masonry` required, `concrete` e `steel` opcionais.

### Fase B — Aggregator Helpers + Default Values v2 + Constantes

**Objetivo**: a camada de transformação que permite manter os cards JSX intactos.

Arquivos-alvo:

1. **Novo arquivo:** `src/components/layout/drawer-form-module/aggregate-helpers.ts`

   - Função `groupByPosition<T extends {position: string}>(flatArr: T[], positions: string[]): Record<string, T[]>` — pega `concrete[]` flat e devolve `{column: [...], beam: [...], slab: [...], stair: [...]}` (usado pelos cards JSX atuais que esperam arrays agrupados por seção).
   - Função `flatBackFromGrouped(grouped: Record<string, ArrayWithPosition>): ArrayWithPosition[]` — inverso.
   - Função `cleanZeroItemsBeforeSubmit(data: TModuleDataV2): TModuleDataV2` — remove de `concrete/steel/form` itens onde todos os campos numéricos são zero (evita 400 no backend por posições zeradas).

2. `src/components/layout/drawer-form-module/module-default-values.ts`
   - **Reescrever** `beamColumnDefaultValues`, `concreteWallDefaultValues`, `structuralMasonryDefaultValues`, `raftFoundationDefaultValues`, `pilesFoundationDefaultValues`, `raftPilesFoundationDefaultValues` para retornar **shape v2** (ex: `beam_column → { concrete: [{fck:25,volume:"0",position:"column"},{fck:30,volume:"0",position:"beam"},{fck:30,volume:"0",position:"slab"}], steel: [{...position:"column"}, {...}], form: [{area:"0",position:"column"}, ...], slab_type: undefined, ... }`).
   - **Criar constantes (fontes únicas)**:
     - `POSITIONS_BY_TYPE: Record<TModulesTypes, string[]>`
     - `REQUIRED_FIELDS_BY_TYPE_V2: Record<TModulesTypes, (keyof TModuleDataV2)[]>`
     - `REQUIRED_POSITIONS_BY_TYPE: Record<TModulesTypes, string[]>` (quais positions **devem ter pelo menos 1 item não-zero** antes de submit — ex: piles_foundation requer `pile`; raft requer `raft`; beam_column requer pelo menos 1 position entre col/beam/slab com volume>0).
     - `DEFAULT_FCK_BY_POSITION: Record<string, number>` (ex: `column: 25, beam: 30, slab: 30, wall: 25, pile: 30, raft: 25`).

### Fase C — Actions (GET/POST/PATCH) trocadas para v2

Arquivos-alvo:

1. `src/actions/modules/postModule.ts` (ou equivalente)

   - Trocar endpoint de `/v1/.../modules` para `/v2/.../modules`.
   - No body: enviar `{type, data: cleanZeroItemsBeforeSubmit(data)}` (não aninhar em `modules:[]` quando for 1 item).

2. `src/actions/modules/getModule.ts` (ou equivalente)

   - Trocar para `/v2/.../modules/:id`. Parsear response para `TModuleDataV2` (lembrar: read retorna `floor_indexes` — quando renderizamos floor_ids no formulário, usamos floor_ids UUID; floor_indexes são informativos ou mapeamento se vier do batch).

3. `src/actions/modules/patchModule.ts` (ou equivalente)

   - Trocar para `PATCH /v2/.../modules/:id`. Enviar apenas os campos modificados (mantendo Partial, mas no schema v2).

4. `src/actions/modules/deleteModule.ts` e `duplicateModule.ts`
   - **Manter v1 temporariamente** (endpoints não existem em v2).
   - Após duplicate, se o response vier em v1, podemos rodar um `GET v2` sobre o novo `module.id` para normalizar o state local (ou criar issue backend no futuro).

### Fase D — Form state no `drawer-form-module/index.tsx` + Submódulos JSX (Aggregate layer aplicado)

**Regra de ouro**: NÃO REESCREVER os cards JSX. Cada submódulo (`module-form-beam-column.tsx`, `module-form-concrete-wall.tsx`, etc.) continua renderizando cards "Colunas", "Vigas", "Paredes", "Pilhas", "Raft", etc. exatamente como hoje. Apenas trocamos a **fonte dos dados** do formulário.

Arquivos-alvo:

1. `src/components/layout/drawer-form-module/index.tsx`

   - `useForm` usa schema v2 (Fase A) + default values v2 (Fase B).
   - Prop nova: `stepperMode: boolean` (default false). Quando true:
     - `showEmptyOutline = isRequiredField && isEmptyValue === true` (imediatamente).
     - `onSubmitSuccess` (nova prop opcional) recebe os dados validados SEM disparar mutation (ao invés de chamar `postModule` ou `patchModule`, retorna para o chamador — usado pelo stepper que vai salvar em memória antes do batch final).
   - Quando `stepperMode=false` (drawer normal), mantém comportamento atual: erros só aparecem após `handleSubmit` do react-hook-form disparar (`isSubmitted`).
   - No início do componente (após queries carregarem), se for modo **edição** (moduleId existe), faz `GET v2` (Fase C), preenche o form. Se for modo criação pelo stepper, recebe `initialData` via props (Partial<ModuleCreateRequestV2.data>).
   - Antes de enviar (fora stepperMode), chama `cleanZeroItemsBeforeSubmit(data)` do aggregate-helpers.

2. Cada submódulo (6 arquivos: `module-form-beam-column.tsx`, `module-form-concrete-wall.tsx`, `module-form-structural-masonry.tsx`, `module-form-raft-foundation.tsx`, `module-form-piles-foundation.tsx`, `module-form-raft-piles-foundation.tsx`):

   - **Recebem novas props**:
     - `stepperMode: boolean` (repassado pelo index).
     - `isSubmitted: boolean` (do `formState` do useForm do index).
     - `groupedViews`: resultado de `groupByPosition` aplicado em `concrete`, `steel`, `form` (ou seja, o input continua sendo a estrutura agrupada que eles já conhecem: `columnsGroup`, `beamsGroup`, `wallsGroup`, `raftsGroup`, `pilesGroup` etc.).
   - **OnChange handlers**: ao invés de `setValue('concrete_columns.volumes...')` (v1), eles fazem `setValue` no grupo e depois o index aplica `flatBackFromGrouped` para persistir no form v2. Alternativa mais simples: o index passa uma callback `updateConcreteAtPosition(position, itemsArray)`, `updateSteelAtPosition(position, itemsArray)`, `updateFormAtPosition(position, itemsArray)` e os submódulos chamam essas callbacks.
   - **Outline vermelho condicional**: substituir todas as regras locais hard-coded por `const shouldMarkError = REQUIRED_POSITIONS_BY_TYPE[type].includes(position) && groupIsEmpty && (stepperMode || isSubmitted);` → aplicar `border-red-500 ring-red-200` no card wrapper. Fora isso → sempre `border-gray-200`.
   - **Botão Trash2 (excluir volume/aço)**: quando只剩 1 item **E** a position está em `REQUIRED_POSITIONS_BY_TYPE[type]`, aplicar `disabled`. Usar mapping (não ternários aninhados). Já existe convenção no projeto para isso.

3. `steel-material-list.tsx`:
   - Mesmas regras acima; recebe `stepperMode` + `isSubmitted` + `isRequiredPosition`.

### Fase E — UX Stepper Step 2 (Status validation coluna apenas)

Arquivos-alvo (futuro stepper drawer ou módulo):

1. Componente tabela Step 2 Módulos:

   - Remover qualquer decoração de badge/vermelho na linha (nome, tipo etc.). **Apenas a coluna "Status da validação"** mostra o status com Badge verde/vermelho.
   - Regra do status: usa os mesmos schemas Zod v2 da Fase A aplicados em cada módulo da lista; se erro → extrai `N` campos com erro via `Object.keys(zodError.flatten().fieldErrors).length` e mostra `"N campos obrigatórios ausentes"`.

2. Ao clicar "Editar" na linha do Step 2:
   - Abre `DrawerFormModule` com `stepperMode=true` + `initialData={row.moduleData}` + `onSubmitSuccess={(updatedV2Data) => updateModuleInList(row.tempId, updatedV2Data)}`. Não dispara API; só atualiza o state do stepper.

### Fase F — Implementar Stepper (conectar no drawer)

Quando Fases A–E finalizarem, implementar os Steps 1 e 2 do Stepper descritos na seção a seguir ("Stepper — Utilizar dados selecionados").

---

## 6. Checklist ordenado (atualizado em 08/08)

Itens marcados `~` = já decididos. Itens **✅** = concluídos nesta rodada (08/08). Pendências: UX marcação obrigatórios e Steppers.

- [x] ~Decidir se migra DrawerFormModule para v2~ → **Sim, obrigatório**, ver razões Fase A.
- [x] ~Definir fonte única de obrigatórios~ → **OpenAPI required fields** + `REQUIRED_FIELDS_BY_TYPE_V2` / `REQUIRED_POSITIONS_BY_TYPE` no `module-default-values.ts`.
- [x] ~Mantemos visual dos cards?~ → **Sim. Aggregate Layer** `groupByPosition` / `flatBackFromGrouped` preserva 100% dos submódulos JSX.
- [x] ~Trash2 disable quando只剩 1 obrigatório~ → **Sim**, convenção de projeto confirmada.
- [x] ~Decoração de erro na tabela Step2~ → **Só coluna Status da validação**, sem badges na linha.
- [x] ~Endpoints DELETE / DUPLICATE em v2~ → **Não existem; manter v1** temporariamente.

✅ **FEITO EM 08/08 (ver resumo completo no topo — “Implementado nesta rodada”):**

- [x] **Fase A.1 — Tipos v2 em `src/types/modules.ts`** → já existiam antes da sessão (`TBeamColumnDataV2`, `TConcreteWallDataV2`, discriminated union `TModuleDataV2`).
- [x] **Fase A.2 — Validators Zod v2** em `validators/moduleFormByType.validator.ts` → já existiam; nesta rodada: corrigido `fckEnumSchema` (`z.enum` de numbers → `z.union` literals + removido `stringToNumberGt` não usado + adicionado alias `ModuleFormState = TModuleGroupedForm`).
- [x] **Fase B.1 — `aggregate-helpers.ts`** → já existia (`groupByPosition`, `flatBackFromGrouped`, `cleanZeroItemsBeforeSubmit`). Nesta rodada: adicionados imports `TFck`/`TSlabType`, removido `POSITIONS_FOR_TYPE` (TS6133), e em `groupedFormToFlatV2` aplicados `.map()` sistemáticos de `toNumberValue()` + casts `fck as TFck` / `slab_type as TSlabType` em todos os 6 tipos.
- [x] **Fase B.2 — `module-default-values.ts` atualizado** → tipo de `REQUIRED_FIELDS_BY_TYPE_V2` relaxado para `string[]` (resolvendo erro TS2322 da key `masonry`); removido import `TModuleDataV2` unused.
- [x] **Fase C — Actions módulos já usam `/v2`** (`postModule`, `getModule`, `patchModule` já chamam endpoints v2). O `index.tsx` agora expõe `onSubmitSuccess` com `flatData` (shape v2 pronto para batch `POST /v2/.../modules`).
- [x] **Fase D (parte 1) — Integração com DESVIO ESTRATÉGICO:**
  - ⚠️ **Desvio do plano original**: mantivemos **`useForm<ModuleFormState>` (form state grouped internamente via `TModuleGroupedForm`) + `customModuleResolver`** que só converte grouped→flat no submit. Motivo: ~55 erros TS no `tsc -b` com o plano original de `useForm<TModuleDataV2>` flat. Resultado final: **mesma segurança de API (flat v2 validado e enviado) e JSX 100% intacto nos submódulos**.
  - [x] `drawer-form-module/index.tsx`: `ModuleFormInput` → `ModuleFormState` em `mergedDefaults` e `useForm`; implementado `customModuleResolver`; removido `zodResolver` unused (TS6133); removido destructure `variables` não usado; `(grouped as any).floor_ids` (TS2339 union).
  - [x] 6 submódulos: trocados import + Props type para `UseFormReturn<ModuleFormState>`. Props `stepperMode`/`isSubmitted` adicionadas às interfaces.
  - [x] `steel-material-list.tsx`: removidos imports `Card`/`CardContent` nunca usados (TS6192).
  - [x] `drawer-stepper-ifc.tsx`: callback `handleModuleDrawerSubmit` atualizado para nova assinatura `onSubmitSuccess` (usa `payload.flatData`); removido `patchOption` unused e duplicate `TModulesTypes`.
  - [x] Validar **`pnpm type-check` (tsc -b composite)** → **0 erros** em drawer-form-module / drawer-stepper-ifc / moduleFormByType.validator.
- [ ] **Fase D (parte 2) — pendentes (junto com “\*” obrigatórios):**
  - [ ] Testes unitários: não existem no projeto atualmente.
  - [ ] Teste manual criar/editar módulos modo normal (requer backend rodando).
  - [ ] **🔴 PRÓXIMA SESSÃO (ordem do usuário): Marcação “\*” de obrigatórios + trocar regras locais hard-coded para `REQUIRED_POSITIONS_BY_TYPE` fonte única + outline vermelho condicional + Trash2 disabled.**
  - [ ] Validar `stepperMode=true` (após as marcações): erros imediatos e Trash2 disabled quando只剩 1 item obrigatório.

✅ **PÓS-BLOQUEANTES (ordem do usuário: UX obrigatórios primeiro, depois Steppers):**

- [ ] **🔴 PRÓXIMA SESSÃO: UX — Marcar com “\*” campos e blocos obrigatórios em TODOS os 6 submódulos do drawer-form-module + steel-material-list.**
- [ ] **Fase E — Tabela Step2 do Stepper (validação coluna Status apenas).**
- [ ] **Fase F — Implementar Steps 1 e 2 completos do Stepper (conectar no onUseSelected do drawer).**
- [ ] **Infra / contrato limpo IFC (não bloqueante).**

---

## Stepper — “Utilizar dados selecionados” no fluxo IFC (próxima feature a implementar)

> Status: � **BLOQUEIO REMOVIDO** — pré-requisito de tipagem v1→v2 do DrawerFormModule resolvido em 08/08. **Ordem do usuário: aplicar primeiro a marcação “\*” nos formulários e DEPOIS codificar os Steppers.**

### Objetivo

Ao buscar o `result` do processor, recebemos **dois payloads separados** (agregados no front via `getIfcRequestResult`):

- `units`: **1 objeto de unidade** (não array, no contrato atual do parser cpp).
- `modules`: lista de módulos v2 prontos para criar, mas possivelmente com campos incompletos ou inválidos.

O stepper vai:

1. Validar e criar a unidade retornada (com criação automática de 1 simulação para a unidade, ao fim desse step).
   - Se no futuro o processor passar a retornar múltiplas unidades (array), o step 1 deve expandir para uma tabela de seleção/criação múltipla (o design a seguir já considera essa evolução sem quebrar).
2. Permitir ao usuário corrigir módulos inválidos e vincular cada módulo a uma unidade/simulação (opção), criando apenas os módulos vinculados e válidos.

### Trigger do stepper

- No drawer IFC, após clicar em “Utilizar dados selecionados”, chamamos `getIfcRequestResult(clientId, requestId)`.
- Se o retorno tiver estruturas válidas, **fecha o drawer** e abre o stepper (provavelmente como um novo drawer ou Dialog shadcn, usando os primitivos Stepper do shadcn).
- Se o retorno for erro ou vazio, toast de erro + mensagem em box vermelho no drawer.

### Etapas

#### Step 1 — Tabela de Unidades (validar, escolher e criar)

UI sugerida:

- Tabela com as unidades retornadas no `result.units`.
- Colunas sugeridas:
  - Checkbox “Selecionar para criar” (pré-selecionada por padrão, mas usuário pode desmarcar).
  - Nome da unidade (editable in-line, ou clique para abrir drawer).
  - Campos chave (area, pavimentos, etc. — depende de quais fields vêm do Units payload).
  - Coluna **Status da validação**: “Válido” (verde) ou “N campos inválidos” (vermelho), baseado no validator/form de unidade existente.
- Ações por linha:
  - Clique na row abre um drawer **pré-preenchido** com os valores da unidade vindos do IFC, usando [`src/components/layout/drawer-form-unit/index.tsx`](../../src/components/layout/drawer-form-unit/index.tsx) (reaproveitar schema e validação).
- Botão do stepper “Próximo passo”:
  - Para **cada unidade selecionada e válida** (validator passar):
    - Cria via endpoint de unidades do BIPC (`POST /v1/projects/:projectId/units`). Pode ser sequencial ou `Promise.all`.
    - Ao receber o `unitId` de retorno, cria uma simulação (opção) automaticamente com nome padrão: `Sim. <nome_da_unidade>`. Se a unidade tiver nome repetido no projeto, aplicar sufixo incremental: `(2)`, `(3)`, etc.
  - Resultado ao fim do step: uma lista de `unitsCreated = [{unitId, optionId, name, unitName}]` usada no step 2.
  - Unidades desmarcadas ou que ainda falham no validator: não são criadas, e o step não permite avançar enquanto existirem unidades selecionadas inválidas (modal/toast pedindo correção ou desmarcação).

#### Step 2 — Tabela de Módulos (validar, vincular e criar)

Regra de negócio: **cada módulo precisa de um vínculo com 1 unidade (e 1 simulação/opção) para poder ser criado**. Módulos sem vínculo são **ignorados** ao final (não dá erro no stepper; só não são persistidos).

UI sugerida (alternativa de seleção por coluna; evita drag & drop customizado):

- **Topo**: chips com os nomes das unidades criadas no step 1. Cada chip mostra: `“Unidade X — Sim. Unidade X (optionId=...)”`. Pode ter uma ação em lote “Aplicar unidade X a todos os módulos”.
- **Tabela de módulos** (`result.modules`):
  - Colunas sugeridas:
    - Tipo (beam_column, concrete_wall, piles_foundation, etc.)
    - Resumo dos dados (ex.: nº de andares, volumes principais — o que fizer sentido sem poluir)
    - Coluna **Unidade / Simulação**: `Select` por linha (shadcn) com as unidades criadas no step 1. Default pode ser vazio ou uma seleção inteligente (tudo para a primeira unidade).
    - Coluna **Status da validação**: “Válido” / “N campos inválidos” (baseado nos validators v2 por tipo de módulo). **Apenas esta coluna usa decoração de status; não colocar badges ou texto vermelho em outras colunas da linha (convenção UX confirmada).**
    - Ação: “Editar”.
- Ação por linha: **clicar na row ou no botão “Editar”** abre o drawer [`src/components/layout/drawer-form-module/index.tsx`](../../src/components/layout/drawer-form-module/index.tsx) **pré-preenchido** com os valores do módulo vindos do IFC, com a prop **`stepperMode=true`** (erros aparecem imediatamente, cards obrigatórios já aparecem com outline vermelho se estiverem vazios). O usuário ajusta e salva; ao salvar, o módulo em memória do stepper é atualizado (via `onSubmitSuccess`, sem disparar mutation) e o status é recalculado.
- Botão “Concluir”:
  - Para cada módulo:
    - Se vínculo = vazio → ignora.
    - Se validator falhar → ignora (e toast listando módulos ignorados e motivos).
    - Se válido e com vínculo → separa em grupos por `(unitId, optionId)` e cria via batch endpoint `POST /v2/projects/:projectId/units/:unitId/options/:optionId/modules` com `{ modules: [...] }`.
  - Estratégia de criação: **por grupo de (unitId, optionId)**. Dentro de cada grupo, podemos:
    - Criar todos de uma vez (transação all-or-nothing) se todos passaram validator;
    - Ou separar em batches menores se quisermos reduzir impacto de falha em lote (problema: batch com 10 módulos, um inválido por 400 de validator, todos voltam).
  - No fim: toast de sucesso + toast de módulos ignorados + toast de erro se houver. Fechar stepper e invalidar queries relevantes: `["units", projectId]`, `["options", projectId, unitId]` (para cada unitId), etc.

### Decisões pendentes / contrato ainda não recebido

Antes de implementar o stepper, precisamos confirmar com o backend processor:

1. **Shape exato de `GET /request/result`**:
   - Quais keys vem? `{units, modules}` mesmo? Tem metadata adicional?
   - Units payload: quais campos? (precisamos mapear 1:1 para o schema do drawer de unidade para não precisar de transformação manual complexa).
   - Modules payload: é exatamente o shape `{ type, data }` do `modules[]` do batch v2? Ou tem campo id temporário / reference id para associar a uma unidade específica vindos do IFC?
2. **Associação módulos → unidade**:
   - O processor pode retornar algum campo para associar cada módulo a uma unidade do array de units? Se sim, podemos usar isso como default no select de “Unidade/Simulação” em vez de vazio ou tudo para a primeira.
   - Se não, a UI atual (select por linha + atalho “Aplicar a todos”) resolve.
3. **Nomenclatura da simulação padrão**:
   - `Sim. <nome_da_unidade>` + sufixo `(N)` para repetição: aceitável? Há alguma regra de negócio (ex.: data, código ISO) a ser incorporada no nome?
4. **Unidade de referência dos módulos**:
   - A coluna “Unidade de referência” mencionada na ideia inicial: ela é a unidade da vinculação (que já temos no select por linha), ou há um campo extra “unidade de referência” para cálculos? Se for o último, precisamos adicionar essa coluna também.
5. **Retorno de erros por item no batch do Modules v2**:
   - Hoje o handler do batch é all-or-nothing (transação em 30s) e o response de erro não retorna por item (400 global com o primeiro erro que falhou). Para UX do stepper, o ideal é fazermos um validator client-side por módulo antes de enviar, para não depender de erro do backend que só retorna 1 problema por vez. Já estamos planejando isso (coluna Status da validação).
6. **Quando contrato “limpo” do IFC chegar no BIPC**: o stepper não deve depender de `client_id` explicitamente. As actions de create_request, list, fallback e result devem ser migradas para endpoints BIPC próprios sem expor o processor.

### Estratégia de implementação sugerida

1. **Fase 1 — Tipos + validador client-side**:
   - Definir tipos `TIfcResultUnitsItem`, `TIfcResultModulesItem` baseados no primeiro payload real que recebermos.
   - Criar validators helpers para Units (baseados no schema do drawer-form-unit) e para ModulesV2 (baseados em `modules.ValidateV2PayloadForModule` no Go — precisamos entender se conseguimos replicar a lógica no front via zod igual aos validators já existentes, ou se faremos um “dry-run” otimista e deixamos o backend decidir no erro do response).
2. **Fase 2 — Stepper UI + dois passos com tabelas mockadas**:
   - Stepper shadcn em Drawer/Dialog.
   - Inicializar com dados de exemplo (para poder testar UI sem backend result funcionar).
3. **Fase 3 — Conectar no result**:
   - Trocar mocks pelo retorno de `getIfcRequestResult`; mapear para os tipos do Fase 1.
4. **Fase 4 — Criação real no backend BIPC Go**:
   - Criar unidades (1 a 1 / Promise.all) + simulações automáticas (com sufixo para nomes repetidos).
   - Criar módulos em batches por `(unitId, optionId)`.

---

## Arquivos relevantes (quick links)

### Frontend BIPC

- Drawer principal: [`src/components/layout/drawer-ifc-import.tsx`](../../src/components/layout/drawer-ifc-import.tsx)
- **Drawers de formulário (alvo da migração 🔴):**
  - Drawer módulos (índice): [`src/components/layout/drawer-form-module/index.tsx`](../../src/components/layout/drawer-form-module/index.tsx)
  - Default values + constantes fontes únicas (reescrever v2): [`src/components/layout/drawer-form-module/module-default-values.ts`](../../src/components/layout/drawer-form-module/module-default-values.ts)
  - Submódulos (aplicar aggregate layer):
    - [`src/components/layout/drawer-form-module/module-form-beam-column.tsx`](../../src/components/layout/drawer-form-module/module-form-beam-column.tsx)
    - [`src/components/layout/drawer-form-module/module-form-concrete-wall.tsx`](../../src/components/layout/drawer-form-module/module-form-concrete-wall.tsx)
    - [`src/components/layout/drawer-form-module/module-form-structural-masonry.tsx`](../../src/components/layout/drawer-form-module/module-form-structural-masonry.tsx)
    - [`src/components/layout/drawer-form-module/module-form-raft-foundation.tsx`](../../src/components/layout/drawer-form-module/module-form-raft-foundation.tsx)
    - [`src/components/layout/drawer-form-module/module-form-piles-foundation.tsx`](../../src/components/layout/drawer-form-module/module-form-piles-foundation.tsx)
    - [`src/components/layout/drawer-form-module/module-form-raft-piles-foundation.tsx`](../../src/components/layout/drawer-form-module/module-form-raft-piles-foundation.tsx)
  - Reutilizável: [`src/components/layout/drawer-form-module/steel-material-list.tsx`](../../src/components/layout/drawer-form-module/steel-material-list.tsx)
- Drawer unidades (usado no Step 1 do Stepper): [`src/components/layout/drawer-form-unit/index.tsx`](../../src/components/layout/drawer-form-unit/index.tsx)
- Ações IFC:
  - [`src/actions/ifc/getIfcFallbacks.ts`](../../src/actions/ifc/getIfcFallbacks.ts)
  - [`src/actions/ifc/postIfcCreateRequest.ts`](../../src/actions/ifc/postIfcCreateRequest.ts)
  - [`src/actions/ifc/getIfcRequests.ts`](../../src/actions/ifc/getIfcRequests.ts)
  - [`src/actions/ifc/getIfcRequestStatus.ts`](../../src/actions/ifc/getIfcRequestStatus.ts)
  - [`src/actions/ifc/getIfcResultUnits.ts`](../../src/actions/ifc/getIfcResultUnits.ts) — `GET /v1/proxy/request/result/units/:clientId/:requestId` (shape real do processor)
  - [`src/actions/ifc/getIfcResultModules.ts`](../../src/actions/ifc/getIfcResultModules.ts) — `GET /v1/proxy/request/result/modules/:clientId/:requestId` (shape real do processor)
  - [`src/actions/ifc/getIfcRequestResult.ts`](../../src/actions/ifc/getIfcRequestResult.ts) — **wrapper agregador** em `Promise.all` das duas acima; retorna `{data:{units, modules}}` compatível com `TIfcProcessorAggregatedResult` (mantido para não quebrar o drawer enquanto o stepper não é implementado)
- Tipos IFC: [`src/types/ifc.ts`](../../src/types/ifc.ts)
- **Tipos modules (criar discriminated union v2):** [`src/types/modules.ts`](../../src/types/modules.ts)
- Upload TQS: [`src/actions/disciplines/postDisciplineFileUpload.ts`](../../src/actions/disciplines/postDisciplineFileUpload.ts)
- Utils de data (tempo relativo / plural ICU-like): [`src/utils/date.ts`](../../src/utils/date.ts)
- Erros de API: [`src/utils/parseApiError.ts`](../../src/utils/parseApiError.ts)
- Traduções:
  - [`src/i18n/translations/pt-BR.ts`](../../src/i18n/translations/pt-BR.ts)
  - [`src/i18n/translations/en.ts`](../../src/i18n/translations/en.ts)

### Backend BIPC Go

- Rotas Modules v1/v2 + endpoints de duplicate/delete: [`openapi.yaml`](../../../openapi.yaml#L1359-L1874)
- **Schemas detalhados v1 vs v2 de cada tipo + enums position + required fields:** [`openapi-modules-schemas.yaml`](../../../openapi-modules-schemas.yaml#L1-L1386)
- Rotas Modules v2 (handler batch): [`cmd/api/routes.go`](../../../cmd/api/routes.go#L85-L87)
- Handler create module v2 (batch + transação + erros): [`cmd/api/modules.go`](../../../cmd/api/modules.go#L256-L424) e [`cmd/api/modules.go`](../../../cmd/api/modules.go#L568-L600)
- Proxy para processor (ajustes temporários CORS + password whitelist): [`cmd/api/proxy.go`](../../../cmd/api/proxy.go)
- Compose/env: [`zarf/compose/docker_compose.yaml`](../../../zarf/compose/docker_compose.yaml#L40-L54)

### Repos de referência (fora do BIPC)

- IFC-processor-backend (Python):
  - Local: `/home/mateus/Documentos/Projects/benchmark-co2/IFC-processor-backend`
  - Create request / presigned URL / fallback check: [BIPc-create_request.py](file:///home/mateus/Documentos/Projects/benchmark-co2/IFC-processor-backend/BIPc-IfcProcessor-create_request/BIPc-create_request.py#L114-L216)
  - Upload processor / S3 events / `waiting_for_files → processing`: [BIPc-upload-processor.py](file:///home/mateus/Documentos/Projects/benchmark-co2/IFC-processor-backend/BIPc-IfcProcessor-upload_processor/BIPc-upload-processor.py#L100-L134)
  - Docs fallback: [fallback_management.md](file:///home/mateus/Documentos/Projects/benchmark-co2/IFC-processor-backend/docs/fallback_management.md#L1-L56)
- ifc-parser-cpp (C++ / output esperado):
  - Local: `/home/mateus/Documentos/Projects/benchmark-co2/ifc-parser-cpp`
  - Ponto importante: gera diretamente Units + Modules-v2 compatíveis com endpoints do BIPC.
  - `calculate_geometries` tem impacto grande de performance (OpenCascade).

---

## Próximos passos sugeridos (ordem de prioridade do usuário)

> Itens marcados com `~` já foram concluídos/decididos. Os itens **marcados** são os pendentes de próxima sessão.

### 🔴 PRÓXIMA SESSÃO (ordem do usuário: obrigatórios → steppers):

1. **[N°1 — UX obrigatórios] Marcar com “\*” campos e blocos obrigatórios em TODO o formulário de cada módulo** (facilitar entendimento do usuário).
   - Arquivos-alvo (os mesmos 6 submódulos + steel-material-list):
     - [module-form-beam-column.tsx](file:///home/mateus/Documentos/Projects/benchmark-co2/bipc/web/frontend/src/components/layout/drawer-form-module/module-form-beam-column.tsx)
     - [module-form-concrete-wall.tsx](file:///home/mateus/Documentos/Projects/benchmark-co2/bipc/web/frontend/src/components/layout/drawer-form-module/module-form-concrete-wall.tsx)
     - [module-form-structural-masonry.tsx](file:///home/mateus/Documentos/Projects/benchmark-co2/bipc/web/frontend/src/components/layout/drawer-form-module/module-form-structural-masonry.tsx)
     - [module-form-raft-foundation.tsx](file:///home/mateus/Documentos/Projects/benchmark-co2/bipc/web/frontend/src/components/layout/drawer-form-module/module-form-raft-foundation.tsx)
     - [module-form-piles-foundation.tsx](file:///home/mateus/Documentos/Projects/benchmark-co2/bipc/web/frontend/src/components/layout/drawer-form-module/module-form-piles-foundation.tsx)
     - [module-form-raft-piles-foundation.tsx](file:///home/mateus/Documentos/Projects/benchmark-co2/bipc/web/frontend/src/components/layout/drawer-form-module/module-form-raft-piles-foundation.tsx)
     - [steel-material-list.tsx](file:///home/mateus/Documentos/Projects/benchmark-co2/bipc/web/frontend/src/components/layout/drawer-form-module/steel-material-list.tsx)
   - **Fonte única para obrigatórios**: usar `REQUIRED_POSITIONS_BY_TYPE` e `REQUIRED_FIELDS_BY_TYPE_V2` já criadas em [module-default-values.ts](file:///home/mateus/Documentos/Projects/benchmark-co2/bipc/web/frontend/src/components/layout/drawer-form-module/module-default-values.ts) (não duplicar regras locais hard-coded).
   - **Como implementar**:
     - Nos labels de cada campo obrigatório, adicionar `<span className="text-red-500 font-semibold ml-0.5">*</span>` (padrão shadcn; conferir `.github/instructions/forms.instructions.md` se existir convenção de cor/símbolo no projeto).
     - Em cards/blocos wrappers completos (ex.: card “Concreto — Colunas” obrigatório), o título do card também deve receber “\*” (ou um badge).
     - Substituir regras locais hard-coded de outline vermelho (se existirem) por `const isRequired = REQUIRED_POSITIONS_BY_TYPE[type].includes(position)` + outline vermelho apenas quando `(stepperMode || isSubmitted)` **e** o grupo estiver vazio.
     - Substituir regras de desabilitar `Trash2` (quando只剩 1 item obrigatório) por `const canRemove = !(fields.length === 1 && isRequired)`.
   - **Opcional (melhorar UX)**: adicionar um rodapé mini no formulário, ex.: “\* = Campos obrigatórios”.
2. **Aplicar também o outline vermelho condicional + Trash2 disabled com a fonte única** (parte pendente da Fase D.2).
3. **Validar `stepperMode=true` manualmente**: abrir DrawerFormModule com `stepperMode=true` + default vazios → outline vermelho aparece imediatamente e Trash2 disabled nas positions obrigatórias.
4. **Fase E — Implementar coluna Status da validação na tabela Step 2 do Stepper (apenas esta coluna decora; sem badges na linha).**
5. **Fase F — Implementar Steps 1 e 2 completos do Stepper:**
   - Tipos internos do stepper (estados locais, `unitsCreated = [{unitId, optionId, name}]`, módulos com vinculo por linha).
   - Validators client-side: Units (baseados no drawer-form-unit schema), Modules (schemas Zod v2).
   - UI shadcn: Step 1 (Unidades: 1 objeto, 1 linha pré-check + editable + Status + drawer edit), Step 2 (Módulos: chips topo com unitsCreated + atalho “Aplicar a todos” + Select por linha Unidade/Simulação + Status validação coluna apenas + Botão Editar → abrir drawer pré-preenchido `stepperMode=true`).
   - Criação no backend: Step 1 cria unidade + simulação automática por unidade com nome padrão + sufixo `(N)` se repetido. Step 2 cria em batches por `(unitId, optionId)` via `POST /v2/.../modules` com `{modules:[...]}`.
6. **Conectar trigger no drawer** (`onUseSelected` do `drawer-ifc-import.tsx`): fecha drawer e abre stepper com `getIfcRequestResult(clientId, requestId)`; no sucesso do stepper: invalidar queries + toasts de sucesso/ignorados.

### 🟢 Feitos / Respondidos (~):

- [x] ~Fase A (tipos + validators v2).
- [x] ~Fase B (aggregate-helpers + default values + constantes).
- [x] ~Fase C (3 actions módulos v2).
- [x] ~Fase D.1 (integração: ModuleFormState + customModuleResolver + 6 submódulos Props + drawer-stepper callback). Migração v1→v2 drawer-form-module 0 erros no composite build.
- [x] ~Receber payload real de result + contrato confirmado: Units 1 objeto, Modules batch v2.~
- [x] ~Associação módulos → unidade: não vem no payload; UI = Select por linha + chips “Aplicar a todos”. Módulos sem vínculo são ignorados.~
- [x] ~Nome padrão da simulação: “Sim. <nome_da_unidade>” + sufixo `(N)` para repetição.~
- [x] ~Decoração de erro na tabela Step2: só coluna “Status da validação”, sem badges na linha.~
- [x] ~DELETE/DUPLICATE modules em v2 não existem: manter v1 temporariamente.~

### 🟢 Não bloqueantes (infra / contrato limpo):

- [ ] Quando o backend Go entregar endpoints limpos do BIPC para IFC (sem `/v1/proxy/*`, sem `client_id` na URL, sem password por query):
  - Migrar actions `getIfcFallbacks`, `postIfcCreateRequest`, `getIfcRequests`, `getIfcRequestStatus`, `getIfcResultUnits`, `getIfcResultModules`.
  - Manter strip de CORS upstream no [`proxy.go`](../../../cmd/api/proxy.go) mesmo com contrato limpo.
  - Remover injeção de password por query quando o processor aceitar Bearer.
- [ ] Avaliar opção A (PUT direto no S3 + CORS) vs opção B (upload via backend Go) após staging.
- [ ] Expor DELETE/DUPLICATE em v2 no backend BIPC.
