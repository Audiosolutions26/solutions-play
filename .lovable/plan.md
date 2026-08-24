# Fades visuais (verde/vermelho) e fim dos buracos na transição

Dois problemas ligados: a waveform não mostra as rampas de fade como no print, e o cálculo da passagem manda a próxima faixa entrar exatamente no fim da atual — por isso sobra silêncio.

## Causa do buraco (confirmada no código)

Em `src/lib/play-transition.ts`, quando não existe marcador `nextEntry`, o ponto de transição vira `defaultTransition = max(cueIn, cueOut)`, ou seja, o fim do áudio. Como `nextTriggerAtSec` deriva desse valor, a próxima faixa só é aberta quando a atual já acabou: sobreposição zero, fade-out sem par, silêncio no ar.

## Mudanças

### 1. Sobreposição real (`src/lib/play-transition.ts`)
- O ponto padrão de transição passa a ser `cueOut - mixMs` (recuando também `nextMixInSec`), sempre limitado a não cair antes do cue-in nem antes de ~15% do áudio já tocado.
- O beat alignment continua, mas quantiza esse ponto recuado, não o cue-out.
- `fadeOutStartSec` padrão = ponto de transição; o fade-out termina no `cueOut`, de modo que `fadeOutMs` e `fadeInMs` cobrem exatamente a janela de sobreposição.

### 2. Fades automáticos por tipo
- Sem marcadores manuais, o fade-in da entrante e o fade-out da atual usam o tempo de mixagem da categoria (`play-mixagem`), com mínimo de ~300 ms em música, para nunca haver corte seco nem lacuna.

### 3. Rampas visuais na waveform (`src/components/play/Waveform.tsx`)
- Desenhar, sobre a forma de onda, uma rampa diagonal **verde** do início (cue-in) até o fim do fade-in, e uma rampa diagonal **vermelha** do início do fade-out até o cue-out — exatamente como no print, com preenchimento translúcido sob a linha.
- As rampas seguem os marcadores/plano em tempo real: mover FADE-IN ou FADE-OUT muda a inclinação na hora.
- Manter as linhas verticais de marcadores existentes; as rampas são camada adicional.

### 4. Disparo no player (`src/hooks/use-player.tsx`)
- Manter o trigger em `nextTriggerAtSec` (agora antecipado) e passar `plan.fadeInMs`/`plan.fadeOutMs` ao motor, sem recalcular o fade a partir do tempo restante.

## Verificação
- Tocar em AUTO duas músicas seguidas: a próxima deve entrar antes do fim da atual, com as duas soando juntas durante o crossfade, sem silêncio.
- Conferir na waveform a rampa verde no início e a vermelha no fim, iguais ao print.
