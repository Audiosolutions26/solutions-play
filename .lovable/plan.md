# Plano: Atualização de Mídias de Demonstração

Este plano substitui todas as músicas de demonstração genéricas pelos arquivos reais enviados pelo usuário, integrando-os como ativos permanentes do sistema e distribuindo-os nas pastas iniciais.

## Alterações Propostas

### 1. Atualização dos Dados Iniciais
- Modificar `src/lib/play-data.ts` para importar os novos ponteiros de ativos (`.asset.json`).
- Substituir a lista `initialBlocks` para incluir as novas músicas reais no bloco musical das 13:00.
- Atualizar a lista `folders` (MPB, Flash Back, Hit Parade, etc.) para utilizar essas mídias, garantindo que o sistema tenha conteúdo real ao navegar pelas pastas.

### 2. Ajuste de Metadados
- Definir durações aproximadas iniciais baseadas nos tamanhos dos arquivos (serão refinadas pelo autocue automático na primeira execução).
- Definir artistas e títulos corretos conforme os nomes dos arquivos originais.

## Detalhes Técnicos
- **Músicas**: 
    - Ana Castela - Olha Onde Eu Tô
    - Clayton & Romário - Não Namora (Ao Vivo)
    - Danilo e Davi - Apaga Apaga Apaga (Ao Vivo)
    - Danilo e Davi - Não Mexe nas Minhas Gavetas (Ao Vivo)
    - Diego & Victor Hugo - Tubarões Ao Vivo
- **Integração**: Uso do `audioUrl` apontando para o `.url` extraído do asset para permitir execução imediata sem necessidade de arquivos locais em modo preview.
