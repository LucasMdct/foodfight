# Design Spec: FoodFight v0.0.1 — Evolução da POC para jogo

> Branch: `feature/v001` · Design de origem: `docs/design/` (Guia de Estilo v0.0.1 + `FoodFight v0.0.1.dc.html` + `Foodie.dc.html`)

## 1. Contexto & Objetivos

O `foodfight-poc` provou o modelo técnico: loop de jogo 100% na **UI thread** via `@shopify/react-native-skia` + `react-native-reanimated` (shared values), **sem re-render do React por frame** — validado em dispositivos ARM (ver `docs/POC-CONCLUSION.md`). Renderiza retângulos genéricos (herói vermelho, obstáculos teal), usa modelo de vida `health:100`, e tem telas de POC (`GameLoader` genérico + `OrientationScreen` de escolha).

Esta versão **evolui a POC para um jogo simples** aplicando o **Guia de Estilo v0.0.1**: identidade "fofo + dopamina", 3 heróis de comida com walk cycle, o vilão Barão Brigadeiro, 3 doces-projéteis, cenário de mesa, seleção de personagem, modelo de 3 vidas, HUD e game over redesenhados.

**Invariante inegociável:** preservar o modelo de performance da POC — um único `Canvas` Skia, gameplay na UI thread, zero re-render por frame. Estado discreto (tela, personagem, vidas, score, recorde) continua em Zustand.

### Objetivos
1. Substituir a renderização genérica pela identidade visual do guia, **tudo em Skia**.
2. Adicionar seleção de personagem, modelo de 3 vidas e game over redesenhado.
3. **Sobrescrever** as telas de POC: novo loading temático; **remover** a `OrientationScreen` (orientação passa a ser **landscape travado por código**).
4. **Centralizar o tema** num único ponto trocável (base para white-label): reskin = trocar tokens + assets de marca.
5. Criar **ícone do app** on-brand.

### Não-objetivos (YAGNI na v0.0.1)
- Persistência do recorde (AsyncStorage) — recorde vive em memória na sessão.
- Sons/música, animação de "arremesso" do vilão, coletáveis bons, contagem 3-2-1 (são v0.0.2 no roadmap do guia).
- Múltiplas marcas configuráveis em runtime — só a **estrutura** centralizada que torna o reskin trivial.

---

## 2. Decisões de arquitetura (aprovadas)

| Decisão | Escolha | Razão |
|---|---|---|
| Renderização de personagens/doces | **Tudo em Skia** | Mantém o invariante de perf (UI thread, zero re-render), um só renderizador, sem nova dependência |
| Fidelidade do walk cycle | **Completo** em todas as instâncias | Pernas ±16° contra-fase (0.32s), braços contra-fase, corpo bob 3px (0.64s) — traço de identidade do guia |
| Escopo da branch | **v0.0.1 inteiro** | Bundle coeso, quebrado em tasks/commits ordenados |
| Recorde | **Em memória** (sessão) | YAGNI; persistência fica p/ versão futura |
| Telas de POC | Loading **sobrescrito** (tema FoodFight); Orientation **removida** | O jogo é landscape por game design; escolha de orientação era artefato de POC |
| Tema | **Centralizado** (`theme/`) + `ThemeProvider`/`useTheme()` | Base de white-label: reskin trocando só tokens + ícone/splash |

---

## 3. Design tokens (`src/theme/`)

Fonte única de verdade, consumida por todo componente RN e por todo desenho Skia. Extraídos do guia:

```ts
// src/theme/tokens.ts (formato ilustrativo)
export const brand = {
  colors: {
    brand:        '#FF6B6B',  brandShadow:  '#E04F4F',   // marca / corações / dano
    positive:     '#7BC950',  positiveShadow:'#59A335',  // ação / saúde / botões
    score:        '#FFB627',  scoreShadow:  '#E09A10',   // pontuação / destaque
    villain:      '#9B5DE5',                             // vilão / mundo doce
    candyPink:    '#FF7BAC',  candyTeal:    '#4ECDC4',   // doces
    bg:           '#FFF3E2',  bgGradTop:    '#FFE9C9',    bgGradBottom:'#FFEFD6',
    surface:      '#FFFFFF',  surfaceAlt:   '#FFFDF6',
    border:       '#F0DFC0',  borderSoft:   '#E7D8BD',
    heartEmpty:   '#E9DAC4',
    textStrong:   '#5A4327',  textBody:     '#8A6A45',   textMuted:'#B08F63',
  },
  radii:   { sm: 14, md: 16, lg: 20, xl: 26, pill: 999 },
  space:   { xs: 4, sm: 8, md: 14, lg: 20, xl: 24 },
  font:    { family: 'Fredoka', weightRegular: '400', weightMedium: '500',
             weightSemibold: '600', weightBold: '700' },
  shadowWarm: 'rgba(90,60,20,0.14)',
} as const;
```

- **White-label:** `ThemeProvider` injeta um objeto de marca; `useTheme()` entrega tokens; desenhos Skia recebem cores via props derivadas do tema. Trocar de marca = trocar o objeto + assets. Nenhum hex hardcoded fora de `theme/`.
- **Fonte Fredoka** carregada via `expo-font` (pesos 400/500/600/700). App só monta a UI após a fonte pronta (o loading cobre esse tempo). **Consultar `https://docs.expo.dev/versions/v56.0.0/` antes de codar o carregamento.**

---

## 4. Personagens em Skia + walk cycle (`src/render/foodie/`)

Cada personagem do `Foodie.dc.html` é **decomposto em primitivas Skia** (`Circle`, `Oval`/`RoundedRect`, e `Path` via `Skia.Path.MakeFromSVGString` para os traços `d="..."`). Cores vêm do tema quando fizer sentido (ex.: bochecha rosada), mas tons próprios do personagem (folha `#66B84E`, grão `#C89A6B`, etc.) ficam num mapa por personagem dentro do módulo.

**Interface:**
```
Foodie({ who: 'alface'|'feijao'|'arroz'|'vilao', size, clock }) → Skia <Group>
```
- Reusável **dentro do canvas do jogo** (herói + vilão) e **dentro de mini-Canvas** (cards de seleção, chip do HUD).
- **Walk cycle** (heróis): partes animadas envolvidas em `<Group transform origin>`:
  - pernas: rotação ±16°, período 0.32s, **contra-fase** entre esquerda/direita;
  - braços: contra-fase análoga;
  - corpo: bob vertical 3px, período 0.64s.
- **Driver de animação:** shared values com `withRepeat(withTiming(...))` (Reanimated), lidos por `useDerivedValue` → transforms Skia. Continua na UI thread, **sem re-render**. Fase por instância derivada de um relógio compartilhado.
- **Vilão:** bob 0.9s + aceno do cetro (grupo `ff-wave`, ~0.7s). É **decorativo** (não é colisor).

**Fronteira/testabilidade:** `Foodie` é função pura de `(who, size, clock)`; a lógica de fase do walk cycle isola-se em `useWalkCycle()`, testável sem render.

---

## 5. Doces-projéteis em Skia (`src/render/candies/`)

Três tipos, portados dos SVGs do design, cada um girando continuamente (`ff-spin`, direções/velocidades distintas):
- **Lolli** (pirulito, `#FF7BAC`) · **Candy** (bala, `#4ECDC4`) · **Donut** (rosquinha, `#F4A259`+`#FF7BAC`).

Interface: `Candy({ type, size, spin }) → Skia <Group>`. O giro é uma rotação derivada de um shared value; o **movimento horizontal** (posição) continua guiado pelo engine (shared values do pool), como na POC.

---

## 6. Cenário (`src/render/scenario/`)

- **Tablecloth:** malha xadrez vermelho-creme (`repeating` 44px) desenhada em Skia, **rolando** para a esquerda (ciclo 88px a 0.9s) via shared value de offset — pausa quando `screen !== 'game'`.
- **LaneDividers:** 2 divisórias tracejadas em `top: 33.33%` e `66.66%` (`rgba(138,90,52,0.28)`).
- **Villain corner (float):** vilão flutuando à direita (`ff-float`, ~1.8s) com drop-shadow.

---

## 7. Modelo de estado & fluxo (`src/store/gameStore.ts`, `App.tsx`)

**Muda de `health` para `vidas`.** Estado discreto (Zustand):
```ts
type Who = 'alface' | 'feijao' | 'arroz';
type Screen = 'select' | 'game' | 'over';
interface GameState {
  screen: Screen;
  who: Who;
  lives: number;   // começa em 3
  score: number;   // +10 por doce desviado
  best: number;    // recorde na sessão (memória)
  fps: number;     // overlay DEV-only (HUD do guia não mostra FPS)
}
```
Ações: `pick(who)`, `start()`, `hit()` (-1 vida; `screen='over'` e atualiza `best` quando chega a 0), `incrementScore(n)`, `toSelect()`, `updateFps(n)`.

**Fluxo do App:** `loading (tema FoodFight) → select → game → over`.
- `OrientationScreen` **removida**; no boot, `ScreenOrientation.lockAsync(LANDSCAPE)`.
- `GameLoader` genérico **substituído** por loading on-brand (§9).
- FPS overlay só aparece em `__DEV__`.

---

## 8. Telas (RN Views/Text sobre o Canvas)

Chrome de UI (cards, botões, chip, selos, modal) é **RN Views/Text** com fonte Fredoka e tokens do tema — sobrepostos ao Canvas por `zIndex`. Personagens dentro desse chrome usam mini-`Canvas` com `Foodie`.

### 8.1 Seleção (`src/features/select/`)
Fundo gradiente creme + "blobs" translúcidos. Título "FOOD FIGHT" (marca, text-shadow adesivo), subtítulo em pílula. 3 cards (190px): `Foodie` + nome (cor do personagem) + tagline + 3 corações; **borda `#FFB627` 4px no selecionado**, sombra suave, hover/press. Botão **JOGAR!** verde pílula com sombra sólida deslocada (5–6px) e pulso (`ff-pulse`). Cantinho: vilão + balão "Ninguém escapa dos meus doces!".

### 8.2 Gameplay (`src/features/game/` + `src/hud/Hud.tsx`)
Canvas (§4–6) + HUD sobreposto:
- **Chip do personagem** (pílula branca, borda 2px): mini-`Foodie` + nome + **corações** (cheio `#FF6B6B`, vazio `#E9DAC4`).
- **Selo de score** laranja `#FFB627` com sombra sólida.
- Botão **Sair** (→ `select`).
- Dica de controle no rodapé.

### 8.3 Game Over (`src/features/game-over/`)
Overlay `rgba(70,40,10,0.45)` + card `#FFFDF6` raio 30, `ff-pop`. Vilão, título "Doce demais!", subtítulo, blocos **Pontos** e **Recorde**, botões **Jogar de novo** (verde) e **Trocar herói**.

---

## 9. Loading on-brand (`src/features/loading/`)

Substitui `GameLoader`. Fundo creme/gradiente, logo "FOOD FIGHT" (sombra adesivo), um `Foodie` correndo (walk cycle) e/ou vilão espiando, **barra de progresso** em pílula (trilho `#F0DFC0`, preenchimento `#7BC950`) e transição de "burst" para a seleção. Cobre o carregamento da fonte Fredoka e o lock de orientação. Reaproveita a estética (não a lógica) do `GameLoader` atual.

---

## 10. Engine (`src/hooks/useRunnerEngine.ts`)

Ajustes mínimos, preservando a estrutura do loop:
- **Vidas** no lugar de dano: colisão faz `runOnJS(hit)()` (-1 vida), invuln **1400ms**, pisca via `heroOpacity`. Game over quando `lives === 0`.
- **Constantes do design** (para `constants.ts`): `candySpeed 340` com ramp `+min(260, elapsed*0.006)`; `spawnInterval 900` → `max(420, 900 - elapsed*0.004)`; herói `x = 0.09*W`, `w = 96`, `h = 120`; doce `52`; hitbox conforme design.
- **Tipo do doce** no pool: cada slot ganha `type` (lolli/candy/donut) só para render (padrão `i % 3`).
- **Vilão decorativo** (não colisor). Score `+10` por doce que passa (já existe).
- Layout de lanes por proporção (`lane*laneH + laneH/2`), coerente com o design.

---

## 11. Ícone & assets de marca (`assets/`, `app.json`)

- **Novo ícone** on-brand (motivo: herói/vilão) — criado neste trabalho: `icon.png` (1024²), `android-icon-foreground.png`, splash. `adaptiveIcon.backgroundColor` muda do azul `#E6F4FE` para creme da marca (`#FFF3E2`).
- **Pipeline:** desenhar em SVG (reaproveitando os paths do `Foodie`) e rasterizar para os PNGs nos tamanhos exigidos; fallback documentado se não houver rasterizador no ambiente.
- `app.json`: `orientation: "landscape"`; nome/slug de marca; cores de splash on-brand.
- **White-label:** ícone/splash tratados como assets de marca, trocáveis junto com os tokens.

---

## 12. Estrutura de arquivos alvo

```
src/theme/            tokens.ts · ThemeProvider.tsx · useTheme.ts
src/render/foodie/    Foodie.tsx · characters/{Alface,Feijao,Arroz,Vilao}.tsx · useWalkCycle.ts
src/render/candies/   Candy.tsx (Lolli/Candy/Donut) · useSpin.ts
src/render/scenario/  Tablecloth.tsx · LaneDividers.tsx
src/features/         loading/ · select/ · game/ · game-over/
src/hud/              Hud.tsx
src/hooks/            useRunnerEngine.ts (estendido)
src/store/            gameStore.ts (screen/who/lives/score/best)
src/types/            game.ts · constants.ts (atualizados)
```
**Removidos:** `src/components/OrientationScreen*.tsx`, `src/components/GameLoader*` (substituído). `GameCanvas` é reorganizado em `GameScreen` + módulos de render.

---

## 13. Ordem das tasks (detalhe fino vai para o plano)

1. Tema centralizado (`theme/`) + fonte Fredoka (`expo-font`).
2. `Foodie` em Skia + `useWalkCycle` (4 personagens).
3. Doces em Skia + `useSpin`.
4. Cenário (Tablecloth + LaneDividers + villain float).
5. Engine: vidas, tipos de doce, constantes do design.
6. Store + fluxo do App (screens; remover Orientation; lock landscape).
7. LoadingScreen on-brand (substitui GameLoader).
8. SelectScreen.
9. HUD (chip + corações + selo + Sair).
10. GameOverModal.
11. Ícone/assets + `app.json`.
12. Polish + verificação (lint, boot, FPS em ARM).

---

## 14. Plano de verificação

- `npm run lint` limpo; `tsc` sem erros.
- Boot: loading temático → seleção → jogo → game over, em **landscape** travado.
- Seleção troca `who`; herói/HUD refletem o personagem; 3 corações caem 1 a 1 nas colisões com invuln/pisca.
- Doces girando e rolando; toalha rolando só em `game`; vilão flutuando (não colide).
- Walk cycle visível em herói, cards e chip.
- Recorde atualiza no game over; "Jogar de novo" reinicia; "Trocar herói" volta à seleção.
- **Perf:** conferir que nada reintroduz re-render por frame (gameplay continua em shared values); checar FPS (overlay DEV) em dispositivo ARM, mantendo o resultado da POC.
- Nenhum hex hardcoded fora de `src/theme/`.
