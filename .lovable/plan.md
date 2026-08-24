# Plano de Melhoria Visual e Persistência de Marcadores

O objetivo é garantir que as marcações de mixagem (CUE-IN, CUE-OUT, FADE-IN, FADE-OUT) sejam exibidas corretamente nos decks (StudioDecksPanel) e que todas as alterações manuais ou automáticas sejam persistidas de forma robusta.

## Mudanças

### Frontend (UI/UX)

- **StudioDecksPanel.tsx**:
    - Adicionar o desenho de rampas de fade (Verde para Fade-In, Vermelho para Fade-Out) na `DeckWaveform` para igualar o visual do editor completo.
    - Melhorar a visibilidade das linhas de marcadores, garantindo que elas usem as cores semânticas corretas e rótulos legíveis.
    - Garantir que o `DeckWaveform` reaja a eventos de atualização de marcadores (`sp:markers-updated`).

### Lógica e Persistência

- **use-track-markers.ts**:
    - Garantir que o estado interno do hook seja atualizado globalmente sempre que `saveMarkers` for chamado em qualquer parte do app.
- **Waveform.tsx**:
    - Sincronizar o feedback visual de salvamento.

## Detalhes Técnicos

- Utilizar a técnica de `ctx.clip()` para desenhar as rampas de fade na waveform dos decks.
- Mapear corretamente `fadeInEnd` -> rampa verde e `fadeOutStart` -> rampa vermelha.
- Corrigir o `DeckCard` para passar o ID da track corretamente para o hook de marcadores.

```typescript
// Exemplo de rampa visual na DeckWaveform
const cueIn = markers.find(m => m.kind === 'startPoint')?.positionSec ?? 0;
const fadeInEnd = markers.find(m => m.kind === 'fadeInEnd')?.positionSec ?? (cueIn + 0.8);
// ... desenhar polígono verde translúcido
```
