# Migration Plan V2 — Formulários de Módulo (DrawerFormModule)

> Data de atualização: 2026-08-16  
> Escopo: `/web/frontend/src/components/layout/drawer-form-module/` + types/validators/hooks  
> Fonte contratual: `openapi-modules-schemas.yaml` → `ModulePayloadV2 = { type, data }`

---

## 1. Objetivo

Refatorar completamente o formulário de módulo (Drawers + formulários internos) para **integrar nativamente com o payload V2 da API**. Nenhuma herança ou compatibilidade com o fluxo antigo (default/ifc/tqs, grouped forms, flat V2, unspecified positions) é mantida. Todos os campos passam a viver dentro de `data`, e `type` + `data` são as únicas chaves da raiz.

---

## 2. Contrato de Payload V2

### Formato canônico

```ts
{
  type: "beam_column" |
    "concrete_wall" |
    "structural_masonry" |
    "raft_foundation" |
    "piles_foundation" |
    "raft_piles_foundation";
  data /* campos específicos de cada *DataV2, extraídos do openapi-modules-schemas.yaml */:;
}
```

### Estrutura dos items de array (comuns a múltiplos módulos)

#### `concrete[]` item

```ts
{
  fck: 20 | 25 | 30 | 35 | 40 | 45 | 50;
  volume: number;
  position: TPositionEspecifica;
}
```

#### `steel[]` item

```ts
{
  material: "general" | "rebar" | "mesh" | "strand" | "other";
  other_name?: string;         // só renderiza SE material === "other"
  resistance: "CA50" | "CA60" | "CP190" | "other";
  other_resistance?: number;   // só renderiza SE resistance === "other"
  mass: number;
  position: TPositionEspecifica;
}
```

#### `form[]` item (só estrutura de superfície)

```ts
{
  area: number;
  position: TPositionEspecifica;
}
```

#### `masonry` (só structural_masonry)

```ts
{
  blocks: Array<{ type: string; fbk: number; quantity: number }>;
  mortar: Array<{ fak: number; volume: number }>;
  grout: Array<{
    position: "vertical" | "horizontal";
    volumes: Array<{ fgk: number; volume: number }>;
    steel: Array<SteelMaterialItem>; // mesmo shape do steel[] global
  }>;
}
```

### Campos escalares por módulo (dentro de `data`)

| Campo                                 | beam_column | concrete_wall | structural_masonry | raft_foundation | piles_foundation | raft_piles_foundation |
| ------------------------------------- | ----------- | ------------- | ------------------ | --------------- | ---------------- | --------------------- |
| `floor_ids?: string[]`                | ✅          | ✅            | ✅                 | ❌              | ❌               | ❌                    |
| `floor_index?: number`                | ✅          | ✅            | ✅                 | ❌              | ❌               | ❌                    |
| `floor_indexes?: number[]` (readOnly) | ✅          | ✅            | ✅                 | ❌              | ❌               | ❌                    |
| `unit_id?: string`                    | ❌          | ❌            | ❌                 | ✅              | ✅               | ✅                    |
| `slab_type?: SlabType` (19 valores)   | ✅          | ✅            | ✅                 | ❌              | ❌               | ❌                    |
| `beam_number?: number`                | ✅          | ✅            | ✅                 | ❌              | ❌               | ❌                    |
| `slab_number?: number`                | ✅          | ✅            | ✅                 | ❌              | ❌               | ❌                    |
| `column_number?: number`              | ✅          | ❌            | ❌                 | ❌              | ❌               | ❌                    |
| `avg_beam_span?: number`              | ✅          | ❌            | ❌                 | ❌              | ❌               | ❌                    |
| `avg_slab_span?: number`              | ✅          | ❌            | ❌                 | ❌              | ❌               | ❌                    |
| `wall_thickness?: number`             | ❌          | ✅            | ❌                 | ❌              | ❌               | ❌                    |
| `slab_thickness?: number`             | ❌          | ✅            | ❌                 | ❌              | ❌               | ❌                    |
| `wall_area?: number`                  | ❌          | ✅            | ❌                 | ❌              | ❌               | ❌                    |
| `slab_area?: number`                  | ❌          | ✅            | ❌                 | ❌              | ❌               | ❌                    |
| `raft_area?: number` (readOnly)       | ❌          | ❌            | ❌                 | ✅              | ❌               | ✅                    |
| `raft_thickness?: number` (readOnly)  | ❌          | ❌            | ❌                 | ✅              | ❌               | ✅                    |
| `masonry?: MasonryElement`            | ❌          | ❌            | ✅                 | ❌              | ❌               | ❌                    |

### Posições (enum) específica por módulo

| Módulo                | concrete / steel / form positions               |
| --------------------- | ----------------------------------------------- |
| beam_column           | `column` \| `beam` \| `slab` \| `stair`         |
| concrete_wall         | `wall` \| `slab` \| `stair`                     |
| structural_masonry    | `column` \| `beam` \| `slab` \| `stair`         |
| raft_foundation       | `raft`                                          |
| piles_foundation      | `pile` \| `block` \| `grade_beam` \| `tie_beam` |
| raft_piles_foundation | `raft` \| `pile`                                |

---

## 3. Regras de funcionamento do formulário

### 3.1 Validações = responsabilidade do backend

- TODOS os campos são opcionais em Zod (`z.optional(...)`) e types (`?:`).
- **NÃO use:** `.min(1)`, `.nonempty()`, `.positive()`, `.superRefine()`, `.refine()`.
- Campos podem ser enviados vazios ou não preenchidos: o backend decide o que é necessário por fluxo (ifc/tqs/manual).

### 3.2 Exibição condicional (REGRAS RÍGIDAS)

1. Um módulo só exibe campos do seu `*DataV2` (tabela acima). Renderizar campos que não estão no schema do tipo é erro.
2. Campos condicionais dentro de `steel[]`:
   - `other_name` só aparece se `material === "other"`.
   - `other_resistance` só aparece se `resistance === "other"`.
3. `MasonrySection` só aparece no tipo `structural_masonry`.
4. `form[]` só aparece nos tipos de estrutura (não fundação).
5. `unit_id` (campo de contexto) só é injetado em `data` para módulos de fundação (via wrapper/prop, não input direto de usuário).
6. `floor_ids` / `floor_index` só são injetados em `data` para módulos de estrutura (via contexto FloorPicker do drawer, não input direto de usuário).

### 3.3 Não invente helpers de compatibilidade

- APAGUE (ou não crie) `flatV2ToGroupedForm`, `groupedFormToFlatV2`, `viewFrom*Default`, `viewFrom*Ifc`, `TModuleGroupedForm`, `UNSPECIFIED_POSITION`, `unspecified*`.
- O RHF state **já é** a estrutura do payload (`{ type, data }`). Nenhuma transformação em ida ou volta, exceto `cleanZeroItemsBeforeSubmit` (mantido para remover linhas zeradas).

---

## 4. Inventário de arquivos

### Criar / Reescrever completamente

| Arquivo                                                                         | Status     | Nota                                                                                                                                               |
| ------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/types/modules.ts`                                                          | Reescrever | União discriminada `{ type, data }`. Sem flat V2.                                                                                                  |
| `src/validators/moduleFormByType.validator.ts`                                  | Reescrever | Schema por tipo com `z.optional` em TUDO.                                                                                                          |
| `src/hooks/useModuleV2Form.ts`                                                  | Reescrever | Init form RHF com union. Helpers field array. `toPayload()` = `cleanZeroItemsBeforeSubmit(form.getValues())`.                                      |
| `src/components/layout/drawer-form-module/module-v2-form.tsx`                   | Reescrever | Sections condicionais por tipo. Steel com condicional other\_\*.                                                                                   |
| `src/components/layout/drawer-form-module/masonry-section.tsx`                  | Reescrever | 3 sub-arrays (blocks/mortar/grout). Grout tem nested steel/volumes.                                                                                |
| `src/components/layout/drawer-form-module/steel-material-list.tsx`              | Atualizar  | Adicionar condicionais other_name / other_resistance.                                                                                              |
| `src/components/layout/drawer-form-module/index.tsx` (wrapper DrawerFormModule) | Reescrever | Integração query initial + mutations submit. load do response = `{ type, data }` direto. submit = injeta floor_ids/floor_index ou unit_id em data. |

### Manter (nenhuma ou pouca alteração)

| Arquivo                        | Status         | Nota                                                                                            |
| ------------------------------ | -------------- | ----------------------------------------------------------------------------------------------- |
| `aggregate-helpers.ts`         | Manter parcial | Mantém `cleanZeroItemsBeforeSubmit`. Remove helpers de grouped/legacy se não forem mais usados. |
| `positioned-material-card.tsx` | Manter         | Já renomeado; usa position select enum.                                                         |
| `required-indicators.tsx`      | Manter         | Uso meramente visual (não bloqueia submit).                                                     |
| `module-default-values.ts`     | Atualizar      | Defaults agora retornam `{ type, data }` completo por tipo.                                     |

### Arquivos já deletados (não estão mais)

- `module-form-beam-column.tsx`
- `module-form-concrete-wall.tsx`
- `module-form-structural-masonry.tsx`
- `module-form-raft-foundation.tsx`
- `module-form-piles-foundation.tsx`
- `module-form-raft-piles-foundation.tsx`

---

## 5. Ordem de execução (WORKFLOW 1→7)

**Regra rígida:** rodar `pnpm type-check:strict` após cada etapa e prosseguir somente se exit 0.

1. **Tipos (`types/modules.ts`)**: Reescrever tudo com union discriminada wrapper.
2. **Validators (`validators/moduleFormByType.validator.ts`)**: Union 6 schemas `{ type: z.literal(…), data: z.object(…) }`, tudo `.optional()`.
3. **Hooks (`hooks/useModuleV2Form.ts`)**: Init RHF com union schema, defaults por type, field arrays em todos os níveis (concrete/steel/form/masonry.{blocks,mortar,grout}/grout[i].{volumes,steel}). Helpers de add/remove. `toPayload()` = `cleanZeroItemsBeforeSubmit(values)`.
4. **Components (`module-v2-form.tsx` + `masonry-section.tsx`)**: Sections por tipo. Seção ScalarFields (map do schema), ConcreteList, SteelMaterialList (com other\_\* condicional), FormAreaList, MasonrySectionWrapper.
5. **Atualizar steel-material-list e positioned-card**: Campos condicionais other\_\* no steel.
6. **Wrapper (`index.tsx`)**: Intacto em nomenclatura e referenciadores externos. Integrar com hooks/mutations V2.
7. **QA**: `type-check:strict` exit 0; 6 submits manuais → Network tab confere `{ type, data }` 1:1 com schema YAML.

---

## 7. Lições de ajuste pós-migração (aplicadas em 2026-08-16)

> Esta seção documenta padrões não óbvios que emergiram ao testar a migração com dados reais do back-end. **Seguir estas regras evita regressões graves de UX.**

### 7.1 Back-end pode retornar 3 formatos de `initialModuleData` / `moduleData`

Mesmo que o contrato canônico seja `{ type, data }`, existem 2 formatos adicionais usados no fluxo real. **Qualquer código que lê payload vindo do back-end (query `getModule`, `initialModuleData` prop, `load*` helpers) deve suportar os 3.**

1. **Formato wrapper `{ module: {...} }` (JSON raiz do HTTP):**

   ```ts
   {
     module: {
       id, outdated, consumption, unit_id?,
       type: "concrete_wall" | ...,
       // OU tem .data, OU é flat (abaixo)
     }
   }
   ```

   → Sempre dar `unwrap`: se `raw.module && (raw.module.type || raw.module.data) → usar `raw.module`.

2. **Formato flat SEM `.data` (tudo na raiz):**

   ```ts
   {
     id, outdated, consumption, unit_id?, floor_ids?,
     type: "piles_foundation",
     concrete: [...], steel: [...], form: [...], wall_thickness: 10, // etc
   }
   ```

   → Copiar **todas as chaves, exceto** blacklist `type/id/unit_id/floor_ids/floor_indexes/floor_index/consumption/outdated` para dentro de `data`.

3. **Formato canônico `{ type, data }`:**
   ```ts
   { type: "beam_column", data: { slab_type, concrete, steel, ... } }
   ```
   → Merge `.data` sobre `baseDefaults.data`.

**Arquivos que já implementam isso (manter sincronia):**

- [useModuleV2Form.ts defaultValues useMemo](file:///home/mateus/Documentos/Projects/benchmark-co2/bipc/web/frontend/src/hooks/useModuleV2Form.ts#L59-L142)
- [DrawerFormModule useEffect reset (rawMd unwrap + hasDataShape/hasFlatShape)](file:///home/mateus/Documentos/Projects/benchmark-co2/bipc/web/frontend/src/components/layout/drawer-form-module/index.tsx#L481-L611)
- **Regra extra no hook:** não exigir `initialModuleData.type === type` prop; use sempre `unwrapped.type ?? type` como tipo real.

---

### 7.2 React Hook Form: `useFieldArray` ÚNICO instância por path (NÃO duplique)

**NÃO use** 2 vezes `useFieldArray({ name: "data.masonry.blocks" })` no mesmo tree (uma no hook global e outra em uma subsection). React Hook Form **não sincroniza** múltiplas instâncias para o mesmo path: `append` na instância A não atualiza `fields` na instância B, parecendo que "add/remove não funciona".

**Padrão único:**

1. Criar `masonryBlocksArray` / `masonryMortarArray` / `masonryGroutArray` **APENAS em `useModuleV2Form.ts`**.
2. Passar por props em cascata: `DrawerFormModule → MasonrySection → BlocksSection / MortarSection / GroutSection`.
3. Subsections usam `props.blockFields.fields` e `props.blockFields.append/remove` — **nunca chamam `useFieldArray` internamente**.

---

### 7.3 Rules of Hooks: NÃO chame hooks dentro de `.map()` / loops render

Ex.: `GroutSection` tinha:

```tsx
{
  groutFields.fields.map((_, i) => {
    const volFields = useFieldArray({
      name: `data.masonry.grout.${i}.volumes`,
    });
    // ❌ Crash: "Rendered fewer hooks than expected" ao remover/adicionar item
  });
}
```

**Padrão correto:** extrair para componente filho top-level (ex.: `GroutItemRow`) e **DENTRO do componente filho** chamar `useFieldArray`. Cada instância do componente filho tem seus hooks em ordem estável.

---

### 7.4 Position: sentinela `"unspecified"` + SelectItem fallback disabled

**Por que:** Radix `<Select>` proíbe `SelectItem value=""`. Para representar "Geral" (position omitida no submit) usamos a string sentinela `"unspecified"` no state do form.

- Default (criação/append): **sempre use** `position: "unspecified"` (não `undefined`, não primeiro valor da lista).
- `value={field.value ?? "unspecified"}` + `onValueChange = v => field.onChange(v)` (não converta para undefined no onChange).
- Select option "Geral" (`value="unspecified"`) sempre é a **última opção** no `<SelectContent>`.
- Remover chave no submit: `stripEmptyPosition()` + `shouldStripPosition()` em aggregate-helpers.
- **Fallback disabled:** Se um position carregado da API NÃO estiver na lista de `getPositionsFor(type)` (dados históricos / formatos antigos), renderize um `<SelectItem value={String(field.value)} disabled>` extra. Exemplo em:
  - [ConcreteListSection position](file:///home/mateus/Documentos/Projects/benchmark-co2/bipc/web/frontend/src/components/layout/drawer-form-module/module-v2-form.tsx#L304-L350)
  - [FormAreaSection position](file:///home/mateus/Documentos/Projects/benchmark-co2/bipc/web/frontend/src/components/layout/drawer-form-module/module-v2-form.tsx#L933-L979)

---

### 7.5 FCK custom / FBK / FAK / FGK custom ("Outro") bidirecional

- **Opções padrão:** `FCK_OPTIONS = [20,25,30,35,40,45,50]` (blocos fbk, mortar fak, grout fgk livres / com opções próprias).
- **State:** booleano `customFck` (ou `customFbk`, `customFak`, `customFgk`) em CADA item. Controla se select mostra valor numérico padrão ou `"other"` ("Outro") + input numérico abaixo.
- **UI carrega valor custom (edição):** se `vol.fck` é número mas NÃO pertence a `FCK_OPTIONS` → marcar `customFck=true` automaticamente. **2 camadas de redundância:**
  1. `useEffect reset` do Drawer: percorre `rawData.concrete[]` → `isCustom = !FCK_OPTIONS.includes(fck) || rec.customFck` → `return {...rec, customFck: isCustom}`.
  2. Fallback em cada `currentCustom` do render: `customFckSelected[FK] ?? vol.customFck ?? isNotInList(vol.fck, FCK_OPTIONS)`.
- **Submit:** remover a flag `customFck / customFbk / customFak / customFgk` do payload final (back só recebe o número real no campo de resistência). Ex. concrete em `cleanZeroItemsBeforeSubmit` `aggregate-helpers.ts` L175-L186. Masonry idem.

---

### 7.6 Grid responsivo padrão em TODAS rows de inputs/selects

**Regra unificada (evita Trash caindo para baixo / sobreposição / campos largos demais):**

```tsx
<div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
  {/* cada campo usa col-span responsivo */}
  <FormItem className="col-span-12 sm:col-span-X">...</FormItem>
</div>
```

- `grid-cols-1 sm:grid-cols-12`: mobile empilha tudo vertical; telas ≥sm distribui 12 colunas.
- Inputs numéricos (volume/massa/área/quantity): `className="h-9 w-full max-w-[160px]"` → ocupa célula se for pequena; teto máximo 160px em telas grandes.
- Masonry grids 12 cols (padrão aplicado):
  - **Blocks row:** `type(4) + fbk(4) + quantity(3) + trash(1)` = 12.
  - **Mortar row:** `fak(7) + volume(4) + trash(1)` = 12; trash sempre no canto direito.
  - **Grout volume:** `fgk(5) + volume(6) + trash(1)` = 12.

---

### 7.7 React Query cache + Drawer reaberto (mesmo módulo): SEMPRE use sentinelas de evento

**Bug clássico:** fecha módulo X → abre Y → fecha Y → abre X novamente. React Query retorna o mesmo objeto referencialmente (`moduleData_X === referência anterior`). Como `useEffect reset` tem deps `[moduleData, moduleId, ...]`, as refs não mudam → reset NÃO roda → form fica com defaults vazios do último `handleClose`.

**Padrão obrigatório no DrawerWrapper (index.tsx):**

1. `lastClosedSentinelRef.current = Date.now() + Math.random()` no evento `isOpen=false` (fecha).
2. `openCountRef.current += 1` em `isOpen=true` (abre).
3. **`runKey` único** = `JSON.stringify({ id, type, openN, closedS, checksum })`; guard `prevResetRunKey`:
   - se `runKey === prevResetRunKey` → skip (evita loops).
   - se diferente → roda `form.reset(...resetValues...)`.
4. **`checksumObjectFields(mdAny, [...todos os campos scalar e arrays importantes])`** com stable JSON (keys ordenadas + hash rápido). Detecta mudança de conteúdo mesmo se referência igual.

**Hook side:** `identityRef` salva `JSON.stringify({ t: type, d: initialModuleData })`. Só reseta se identidade mudou. **NÃO sobrescreva o reset do Drawer nos re-renders de mesma identidade.**

---

### 7.8 Modo validação RHF: `mode="onSubmit"` + `reValidateMode="onSubmit"`

`useForm` no `useModuleV2Form.ts`:

```ts
const form = useForm<...>({
  resolver, defaultValues,
  mode: "onSubmit",
  reValidateMode: "onSubmit"
});
```

Razão: ao selecionar position "Geral" (value `"unspecified"`), se houvesse `mode="onChange"` a label de position poderia ficar vermelha (campo required tentaria validar). Validação só dispara quando usuário clica em Salvar — consistente com a regra "obrigatoriedade é responsabilidade do back-end (por enquanto)".

---

### 7.9 Padronização de fonte

- **`FormLabel` SEMPRE** `className="text-xs"`.
- **`Input` / `SelectTrigger` / `SelectContent > SelectItem` / Botões internos** → NÃO use `text-xs` hardcoded (ficavam inconsistentes entre blocos). Use tamanho herdado do shadcn (`text-sm` default).
- Inputs numéricos sempre `h-9` (altura padrão shadcn) + `w-full max-w-[160px]` quando aplicável.

---

### 7.10 BUG CONHECIDO (2026-08-17) — Primeiro elemento de arrays não carrega NA PRIMEIRA abertura

> Relato do usuário: primeiro item de `concrete[]` (ex.: `{fck:25, position:wall, volume:100}`) não carrega no primeiro click de edição do módulo; position/fck aparecem vazios/default. O mesmo para o primeiro item de `form[]`. Se fechar e abrir o mesmo módulo novamente, funciona. **Acontece só na primeira vez.**

#### Reprodução exata
1. Drawer NUNCA aberto nesta sessão.
2. Clique em "editar" no `concrete_wall` salvo com `concrete = [3 itens]`, `form = [2 itens]` (ou qualquer outro tipo com arrays preenchidos).
3. Item `[0]` de concrete / form → não carrega (mantém default do tipo, `position:unspecified` ou fck default).
4. Itens `[1..n]` do mesmo array carregam corretamente.
5. Fechar drawer sem salvar; reabrir o mesmo módulo → todos os itens carregam corretamente.

#### Suspeitas / Ordem de investigação
1. **H1 (Muito provável) — runKey checksum calculado sobre wrapper errado:** no useEffect reset do [DrawerFormModule index.tsx](file:///home/mateus/Documentos/Projects/benchmark-co2/bipc/web/frontend/src/components/layout/drawer-form-module/index.tsx), `checksumObjectFields` pode estar recebendo `rawMd` (wrapper `{module:...}`) ao invés de `mdAny` (unwrapped). O checksum do wrapper não inclui os arrays reais → `runKey` coincide com default anterior → guard `prevResetRunKey.current === runKey` retorna → reset **não é executado**; o form mantém 1 item default do `getDefaultValuesByType(typeInicial)` (que é o item 0 não carregado). Itens 1+ aparecem corretos por outra atualização parcial de hook.
   - **Como confirmar:** debugger na linha do guard e comparar `rawMd vs mdAny` + `runKey anterior vs atual` + `resetValues.data.concrete.length`.
   - **Fix potencial:** (a) garantir checksum sobre `mdAny` unwrapped; (b) adicionar campo no runKey baseado em `resetValues` (ex.: `len_concrete: resetValues.data.concrete?.length`) para garantir que tamanho do array sempre muda a key.
2. **H2 (Provável) — `openCount + closedSentinel` não muda no primeiro load:** `lastClosedSentinelRef.current` inicializa em `0` e no primeiro load nunca foi fechado; `openCount=1` + checksum default → runKey igual a criação.
   - **Fix:** incluir `!!moduleData` (presença) no runKey (mudança `undefined → objeto` sempre altera a key).
3. **H3 — Ordem de useEffects (race):** `useModuleV2Form` `identityRef useEffect` executa **APÓS** Drawer reset e sobrescreve o form com defaultValues do `type` prop inicial (ex.: `beam_column`) que tinha 1 item default.
   - **Fix:** guard no identityRef: só reseta se `initialModuleData` NÃO veio preenchido (criação). Em edição, Drawer reset deve ter precedência final.
4. **H4 (raro) — RHF useFieldArray não sincroniza fields[0] no mesmo microtask do reset:** reset é executado, porém `concreteFields.fields[0]` na primeira renderização ainda tem o item default pré-reset; re-render posterior traz items corretos mas UI "pintou" o primeiro item com estado velho.
   - **Fix rápido:** adicionar `key={moduleId ?? type}` no componente root `<module-v2-form.tsx>` para forçar remount completo quando trocar módulo/identidade do form.

#### Checklist obrigatório de debug (próxima sessão)
- [ ] Breakpoint no guard `prevResetRunKey.current === runKey` (reset é chamado no primeiro load? sim/não).
- [ ] `console.log({ rawMd_shape: typeof rawMd?.module, unwrapped_type: mdAny?.type, hasDataShape, hasFlatShape, len_concrete_resetValues: resetValues.data.concrete?.length, len_concrete_form_getValues: form.getValues().data.concrete?.length })`.
- [ ] Comparar 1º vs 2º click (mesmo módulo): valores de `runKey`, `checksum`, `openN`, `closedS`.
- [ ] Se form.reset() é chamado corretamente e dados em form.getValues() estão corretos mas UI não mostra → workaround `key` no form root.

---

## 8. Critérios de sucesso (atualizados pós-migração)

Além do § 6 original:

- [ ] **3 formatos de resposta back-end** (wrapper `module` / flat / data) preenchem campos corretamente, incluindo position específica e fck fora da lista padrão.
- [ ] **Reabrir módulo X após fechar Y → campos carregam dados reais, não defaults.**
- [ ] **Add/remove blocks / mortar / grout concrete steel form** funcionam em ambos sentidos em masonry e demais.
- [ ] **Rules of Hooks:** nenhum `useFieldArray` / hook aninhado em `.map()`. (Busca rápida: `grep -rn useFieldArray masonry-section` deve retornar 0 usos; os arrays vêm via props.)
- [ ] **FCK custom:** editar item salvo com fck=70 (fora da lista) → select mostra "Outro", input numérico abaixo mostra 70.
- [ ] **Todos grids rows:** mobile empilha, sm+ distribui 12 cols; nenhum botão trash cai para linha de baixo.
