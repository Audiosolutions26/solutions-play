# Plano: Validação e Processamento Automático de Arquivos .mrk

Este plano visa garantir que os marcadores de áudio (mix-in, mix-out, intro, etc.) editados externamente no `mrk_editor` sejam automaticamente integrados ao Solutions-Play no momento em que as faixas entram no sistema.

## Alterações Propostas

### 1. Refinamento do Módulo de Importação (.mrk)
- Atualizar `src/lib/play-mrk.ts` para retornar detalhes da importação (quantidade de marcadores encontrados).
- Melhorar o mapeamento de tipos para garantir compatibilidade total com a V3 do editor.

### 2. Integração na Importação de Programação
- Modificar `src/components/play/AppMenu.tsx` para disparar a busca automática de arquivos sidecar (`.mrk` ou `.pkfinfo`) logo após a importação de uma grade TXT ou PXML.
- Isso garante que, mesmo que o arquivo seja novo na base, ele já venha com as marcações de mixagem.

### 3. Validação Just-in-Time no Player
- Atualizar `src/hooks/use-player.tsx` para tentar uma última importação de marcadores no momento do `playAt` e `prefetchCue`, caso a faixa possua `filePath` mas não tenha marcadores salvos no cache local.
- Adicionar log de evento no painel "Problems" quando um `.mrk` é detectado e importado com sucesso.

### 4. Melhoria no Handler Electron
- Revisar `electron/main.cjs` para garantir que a busca na pasta `mark/` seja insensível a maiúsculas/minúsculas no nome do arquivo, prevenindo falhas comuns no Windows.

## Detalhes Técnicos
- **Mapeamento**: `mix_in` -> `startPoint`, `mix_out` -> `endPoint`, `intro` -> `introEnd`, `voice` -> `locStart`, `stamp` -> `carimbo`, `chorus` -> `refraoStart`.
- **Fluxo**: Ao encontrar um `.mrk`, os marcadores são salvos no `localStorage` sob a chave `solutions-play-markers`. Marcadores marcados como "locked" no sistema não são sobrescritos pela importação automática, preservando edições manuais feitas dentro do software.
