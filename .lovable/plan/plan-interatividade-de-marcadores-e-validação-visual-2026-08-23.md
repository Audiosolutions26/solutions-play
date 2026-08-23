# Plan: Interatividade de Marcadores e Validação Visual

Implementar drag-and-drop para marcadores na waveform e validação visual de sincronia com offset.

## User Review Required

> [!IMPORTANT]
> A implementação usará o mouse para arrastar os marcadores diretamente na Waveform. O "snapping" (alinhamento automático) será feito em incrementos de 0.1s para facilitar o ajuste fino.

## Proposed Changes

### Frontend - Waveform e Interatividade

- **`src/components/play/Waveform.tsx`**:
    - Implementar estados de mouse (`isDragging`, `draggedMarkerId`) para gerenciar o arrasto.
    - Adicionar `onMouseDown`, `onMouseMove` e `onMouseUp` no canvas da waveform.
    - Calcular a nova posição do marcador baseada no deslocamento do mouse e nos pixels por segundo.
    - Implementar "snapping" de tempo (0.1s) e limites (0 a duração do áudio).
    - Atualizar a visualização para mostrar o offset em segundos (ex: `+0.52s`) quando um marcador for movido ou estiver fora dos limites.
    - Destacar marcadores inválidos com brilho vermelho e linha mais grossa.

- **`src/hooks/use-track-markers.ts`**:
    - Adicionar uma função `updateMarkerPosition(id, newSec)` para persistir as mudanças de forma eficiente.

### Audio & Markers - Lógica de Negócio

- **`src/lib/play-markers.ts`**:
    - Melhorar `validateMarkers` para retornar o offset de cada erro, permitindo que o componente Waveform exiba essa informação.

## Technical Details

- **Drag-and-Drop**: O clique no marcador (threshold de 5-10px) ativará o estado de drag. O `mousemove` calculará a delta no eixo X e converterá para tempo (`seconds`).
- **Snapping**: `Math.round(newTime * 10) / 10`.
- **Validação Visual**: Se `markerPositionSec` > `duration` ou < 0, renderizar um indicador flutuante com o texto do offset.
- **Performance**: O componente Waveform já usa `requestAnimationFrame`, então a atualização visual durante o arrasto será fluida.

## Verification Plan

- **Teste de Arrasto**: Abrir o editor, clicar e segurar um marcador (ex: FADE-IN) e movê-lo. Verificar se ele segue o mouse.
- **Teste de Persistência**: Mover um marcador e recarregar a página (ou trocar de deck). O marcador deve permanecer na nova posição.
- **Teste de Validação**: Mover um marcador para além do fim da música. Verificar se ele fica vermelho e mostra o offset (ex: `+2.00s`).
- **Teste de Snapping**: Verificar se o marcador "pula" em pequenos incrementos ao ser movido devagar.
