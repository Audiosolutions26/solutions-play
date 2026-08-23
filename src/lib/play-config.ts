// Esquema de configuração fiel ao "Guia de configuração e uso" (Menu Ferramentas > Opções)
// do manual Playlist Digital 5 — páginas 90-110. Estrutura data-driven.

export type FieldType =
  "switch" | "text" | "number" | "password" | "select" | "textarea" | "tristate"; // Padrão / Sim / Não (permissões de operador)

export interface ConfigField {
  key: string;
  label: string;
  type: FieldType;
  default: string | number | boolean;
  help?: string;
  unit?: string;
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
}

export interface ConfigSection {
  id: string;
  title: string;
  note?: string;
  fields: ConfigField[];
}

export interface ConfigGuide {
  id: string;
  title: string;
  description?: string;
  sections: ConfigSection[];
}

const sw = (key: string, label: string, def = false, help?: string): ConfigField => ({
  key,
  label,
  type: "switch",
  default: def,
  help,
});

const GUIDES_ORDER = ["geral", "operadores", "configuracoes", "insercoes", "licenca"];

// ---- Seções de permissão/comportamento (Guia Geral) ----
const geralSection: ConfigSection = {
  id: "geral",
  title: "Geral",
  fields: [
    sw(
      "personalizaFontes",
      "Personaliza fontes e cores",
      true,
      "Exibe a guia Aparência no menu Exibir.",
    ),
    sw(
      "barraEspaco",
      "Barra de espaços passa p/ próxima inserção",
      true,
      "Interrompe o áudio atual e avança.",
    ),
    sw("modoDark", "Modo Dark", false, "Ativa o modo escuro por padrão."),
    sw("travarPaineis", "Travar painéis", false, "Impede agrupar, mover ou fechar painéis."),
    sw("bloqueiaBlocos", "Bloqueia/Desbloqueia blocos", true),
    sw("adicionaInsercoes", "Adiciona inserções", true),
    sw("removeInsercoes", "Remove inserções", true),
    sw("moveInsercoes", "Move inserções", true),
    sw("salvaEdicaoBloco", "Salva edição de bloco", true),
    sw("visualizaPastas", "Visualiza as pastas", true),
    sw("tocaDasPastas", "Toca inserções diretamente das pastas", true),
    sw("editaMarcadores", "Edita arquivos de áudio (Marcadores)", true),
    sw("editaInfoAudio", "Edita informações de áudio (ID3)", true),
    sw("nomesMaiusculas", "Converter nomes de arquivos p/ maiúsculas", false),
    sw("carimbosHoraTemp", "Usar carimbos de hora-certa e temperatura", true),
  ],
};

const edicaoSection: ConfigSection = {
  id: "edicao",
  title: "Edição",
  fields: [
    sw("umClique", "Inserir com um só clique", false),
    sw("abrirPastaClique", "Abrir pasta com um só clique", false),
    sw("inserirAntes", "Inserir antes do item selecionado", false),
  ],
};

const quickstartSection: ConfigSection = {
  id: "quickstart",
  title: "QuickStart",
  fields: [
    sw("usarQuickstart", "Usar QuickStart", true),
    sw("quickstartRede", "Usar QuickStart via rede", false),
    sw("executarRede", "Executar QuickStart via rede", false),
    sw("comprovarRede", "Comprovar QuickStart via rede", false),
    sw("criaQuickstart", "Cria QuickStart", true),
    sw("paineisIndividuais", "Painéis QuickStart individuais", false),
  ],
};

const mudancasBlocoSection: ConfigSection = {
  id: "mudancasBloco",
  title: "Mudanças de bloco",
  fields: [
    sw("pausarFimBloco", "Sempre pausar execução ao final de um bloco", false),
    sw("pararBlocosVazios", "Parar em blocos vazios", true),
    sw("exibirProximoHorario", "Se parado, exibir próximo bloco no horário", true),
    sw(
      "ignorarTrilhas",
      "Ignorar todas as trilhas e pausas",
      false,
      "Recomendado p/ modo Sem Operador.",
    ),
  ],
};

const blocoMixFields = (prefix: string, aceitaLabel: string): ConfigField[] => [
  sw(`${prefix}Adiciona`, "Adiciona inserções", true),
  sw(`${prefix}Aceita`, aceitaLabel, false),
  sw(`${prefix}Remove`, "Remove inserções", true),
  sw(`${prefix}Move`, "Move inserções", true),
  sw(`${prefix}Descartar`, "Descartar inserções que ultrapassam o bloco", false),
  sw(`${prefix}RemoveBlocos`, "Remove blocos inteiros", false),
];

const tipoFields = (prefix: string): ConfigField[] => [
  sw(`${prefix}Adiciona`, "Adiciona", true),
  sw(`${prefix}Remove`, "Remove", true),
  sw(`${prefix}Move`, "Move", true),
  sw(`${prefix}MoveEntre`, "Move entre blocos", true),
  sw(`${prefix}Avanca`, "Avança para o próximo áudio", true),
];

const exibirPainelSection: ConfigSection = {
  id: "exibirPainel",
  title: "Permitir exibir painel",
  fields: [
    sw("painelProgramacao", "Programação", true),
    sw("painelDisplay", "Display (No AR)", true),
    sw("painelTextosVivo", "Textos ao vivo", true),
    sw("painelAnotacoes", "Anotações", true),
    sw("painelTextoDia", "Texto do dia", false),
    sw("painelHoje", "Hoje", false),
    sw("painelPastas", "Pastas", true),
    sw("painelPropriedades", "Propriedades", true),
    sw("painelMiniSite", "Mini Site", false),
    sw("painelAparencia", "Aparência", true),
    sw("painelCamera", "Camera Controller", false),
  ],
};

// ---- Guia Geral completa ----
const guiaGeral: ConfigGuide = {
  id: "geral",
  title: "Geral",
  description: "Configurações padrão para todos os operadores (Ferramentas › Opções › Geral).",
  sections: [
    geralSection,
    edicaoSection,
    quickstartSection,
    mudancasBlocoSection,
    {
      id: "blocoComercial",
      title: "Bloco Comercial",
      fields: blocoMixFields("bc", "Aceita músicas"),
    },
    {
      id: "blocoMusical",
      title: "Bloco Musical",
      fields: blocoMixFields("bm", "Aceita comerciais"),
    },
    { id: "comerciais", title: "Comerciais", fields: tipoFields("com") },
    { id: "musicas", title: "Músicas", fields: tipoFields("mus") },
    { id: "vinhetas", title: "Vinhetas", fields: tipoFields("vin") },
    { id: "genericas", title: "Inserções Genéricas", fields: tipoFields("gen") },
    {
      id: "pausas",
      title: "Pausas",
      fields: [
        sw("adicionaPausas", "Adiciona pausas", true),
        {
          key: "tempoMaxPausa",
          label: "Tempo máximo",
          type: "number",
          default: 30,
          unit: "s",
          min: 1,
          max: 600,
        },
      ],
    },
    exibirPainelSection,
  ],
};

// ---- Guia Configurações (técnica) ----
const guiaConfiguracoes: ConfigGuide = {
  id: "configuracoes",
  title: "Configurações",
  description: "Placas de saída, rede, disparo remoto, RDS e streaming.",
  sections: [
    {
      id: "playlistServer",
      title: "Playlist Server",
      fields: [
        { key: "psServidor", label: "Servidor (Nome/IP)", type: "text", default: "127.0.0.1" },
        { key: "psPorta", label: "Porta de dados", type: "number", default: 3033 },
        { key: "psUsuario", label: "Usuário", type: "text", default: "admin" },
        { key: "psSenha", label: "Senha", type: "password", default: "" },
      ],
    },
    {
      id: "avancado",
      title: "Avançado",
      fields: [
        {
          key: "advTitulo",
          label: "Título (Nome da emissora)",
          type: "text",
          default: "Estação Demo FM",
        },
        {
          key: "advLogoUrl",
          label: "Logomarca da emissora (URL/caminho)",
          type: "text",
          default: "",
          help: "Opcional. Informe uma URL de imagem ou caminho local do aplicativo desktop.",
        },
        {
          key: "advComputadorAR",
          label: "Computador do AR (Nome/IP)",
          type: "text",
          default: "127.0.0.1",
        },
        { key: "advPorta", label: "Porta de dados", type: "number", default: 3030 },
        { key: "advProxy", label: "Servidor Proxy (servidor:porta)", type: "text", default: "" },
      ],
    },
    {
      id: "stationOffice",
      title: "Station Office",
      fields: [
        sw("soEnviar", "Enviar veiculação para Station Office", false),
        { key: "soCodigo", label: "Código Station Office da emissora", type: "text", default: "" },
      ],
    },
    {
      id: "saidas",
      title: "Saídas",
      note: "Placa de som / saída de áudio por função.",
      fields: [
        {
          key: "saidaProgramacao",
          label: "Programação",
          type: "select",
          default: "principal",
          options: outOpts(),
        },
        {
          key: "saidaPreEscuta",
          label: "Pré-escuta",
          type: "select",
          default: "fones",
          options: outOpts(),
        },
        {
          key: "saidaQuickstart",
          label: "QuickStart",
          type: "select",
          default: "principal",
          options: outOpts(),
        },
        {
          key: "saidaTocar",
          label: "Opção Tocar",
          type: "select",
          default: "fones",
          options: outOpts(),
        },
        {
          key: "saidaComerciais",
          label: "Comerciais",
          type: "select",
          default: "principal",
          options: outOpts(),
        },
        {
          key: "saidaMusicas",
          label: "Músicas",
          type: "select",
          default: "principal",
          options: outOpts(),
        },
        {
          key: "saidaVinhetas",
          label: "Vinhetas",
          type: "select",
          default: "principal",
          options: outOpts(),
        },
      ],
    },
    {
      id: "entradaAudio",
      title: "Entrada de áudio",
      fields: [
        {
          key: "eaPlaca",
          label: "Entrada de áudio",
          type: "select",
          default: "linein",
          options: outOpts(),
        },
        { key: "eaPluginDSP", label: "Plugin DSP", type: "text", default: "" },
        sw("eaExibirParado", "Exibir entrada de linha enquanto parado", false),
        {
          key: "eaTempoFechar",
          label: "Tempo de espera p/ fechar a linha",
          type: "number",
          default: 3,
          unit: "s",
        },
        { key: "eaDtmfPlay", label: "Comando DTMF Play", type: "text", default: "" },
        { key: "eaDtmfStop", label: "Comando DTMF Stop", type: "text", default: "" },
        { key: "eaNivelDtmf", label: "Nível DTMF", type: "number", default: 50, min: 0, max: 100 },
      ],
    },
    {
      id: "disparoRemoto",
      title: "Disparo Remoto",
      fields: [
        sw("drBlocosLocais", "Aceita comandos em blocos locais", false),
        sw("drPlay", "Aceita comando remoto PLAY", true),
        sw("drStop", "Aceita comando remoto STOP", true),
        sw("drPlayProximo", "Se exibindo, PLAY passa para o próximo áudio", false),
      ],
    },
    {
      id: "afiliadaRede",
      title: "Afiliada de rede",
      fields: [
        sw("arAfiliada", "Afiliada de rede (blocos satélite)", false),
        sw("arIniciaSAT", "Se exibindo bloco local, iniciar próximo bloco SAT", false),
        sw("arDisparoHorario", "Aceitar disparo somente no horário", false),
        sw("arPosicionarAuto", "Posicionar automaticamente os blocos", true),
        {
          key: "arMinutos",
          label: "Minutos p/ posicionar e aceitar disparo",
          type: "number",
          default: 5,
          unit: "min",
        },
      ],
    },
    {
      id: "xmlWeb",
      title: "XML com informações para web",
      fields: [
        {
          key: "xmlArquivo",
          label: "Arquivo com informação do item atual",
          type: "text",
          default: "C:\\Playlist\\Pgm\\nowplaying.xml",
        },
        { key: "xmlFtp", label: "Servidor FTP", type: "text", default: "" },
        { key: "xmlFtpUser", label: "Usuário FTP", type: "text", default: "" },
        { key: "xmlFtpSenha", label: "Senha FTP", type: "password", default: "" },
        { key: "xmlFtpArquivo", label: "Arquivo no servidor FTP", type: "text", default: "" },
        sw("xmlFtpPassivo", "FTP Passivo", false),
        { key: "xmlUdp", label: "Enviar XML para UDP (IP:porta)", type: "text", default: "" },
      ],
    },

    {
      id: "cameraController",
      title: "Camera Controller",
      fields: [
        {
          key: "ccSoftware",
          label: "Software",
          type: "select",
          default: "obs",
          options: [
            { value: "obs", label: "OBS" },
            { value: "vmix", label: "vMix" },
          ],
        },
        { key: "ccEndereco", label: "Endereço (IP:porta)", type: "text", default: "" },
        { key: "ccUsuario", label: "Usuário", type: "text", default: "" },
        { key: "ccSenha", label: "Senha", type: "password", default: "" },
      ],
    },
    {
      id: "vlcController",
      title: "VLC Controller",
      fields: [
        { key: "vlcEndereco", label: "Endereço (IP:porta)", type: "text", default: "" },
        { key: "vlcSenha", label: "Senha (interface LUA)", type: "password", default: "" },
      ],
    },
    {
      id: "streaming",
      title: "Metadados para streaming",
      fields: [
        {
          key: "stServico",
          label: "Serviço",
          type: "select",
          default: "shoutcast_v2",
          options: [
            { value: "shoutcast_v1", label: "Shoutcast V1" },
            { value: "shoutcast_v2", label: "Shoutcast V2" },
            { value: "icecast_v2", label: "IceCast V2" },
          ],
        },
        { key: "stServidor", label: "Servidor", type: "text", default: "" },
        { key: "stUsuario", label: "Usuário (IceCast)", type: "text", default: "" },
        { key: "stSenha", label: "Senha", type: "password", default: "" },
        { key: "stId", label: "Id / Mountpoint (IceCast)", type: "text", default: "/stream" },
        { key: "stUrl", label: "URL do website", type: "text", default: "" },
        { key: "stAvra", label: "AVRA (IP:porta)", type: "text", default: "" },
      ],
    },
    {
      id: "diversos",
      title: "Diversos",
      fields: [
        sw("dvTocarAoIniciar", "Tocar programação ao iniciar", false),
        sw("dvDicaDia", "Dica do dia", false),
        {
          key: "dvPastaTrilhas",
          label: "Pasta de trilhas",
          type: "text",
          default: "C:\\Playlist\\Trilhas",
        },
        sw("dvSalvarTxt", "Salvar montagem em TXT", false),
        sw("dvManterOrdem", "Manter ordem da programação", true),
        sw("dvIgnorarBloqueados", "Ignorar atualizações em blocos bloqueados", true),
        {
          key: "dvPercentComprovacao",
          label: "Percentual mínimo p/ comprovação",
          type: "number",
          default: 80,
          unit: "%",
          min: 0,
          max: 100,
        },
        sw("dvDescMixagem", "Desconsiderar tempo de mixagem na comprovação", false),
        sw("dvSalvarDuracao", "Salvar duração da mídia na comprovação", false),
        {
          key: "dvAjusteTemp",
          label: "Ajuste do leitor de temperatura (dezenas)",
          type: "number",
          default: 0,
        },
        {
          key: "dvTempoAtualizacoes",
          label: "Tempo entre atualizações",
          type: "number",
          default: 10,
          unit: "s",
        },
      ],
    },
  ],
};

// ---- Guia Inserções ----
const mixFields = (prefix: string, items: [string, number][]): ConfigField[] =>
  items.map(([label, def]) => ({
    key: `${prefix}${label.replace(/\W/g, "")}`,
    label,
    type: "number" as const,
    default: def,
    unit: "ms",
  }));

const guiaInsercoes: ConfigGuide = {
  id: "insercoes",
  title: "Inserções",
  description: "Tempos de mixagem, fade automático e marcadores por tipo de áudio.",
  sections: [
    {
      id: "tempoMixagem",
      title: "Tempo de mixagem padrão",
      fields: [
        { key: "mixComerciais", label: "Comerciais", type: "number", default: 500, unit: "ms" },
        { key: "mixMusicas", label: "Músicas", type: "number", default: 800, unit: "ms" },
        { key: "mixVinhetas", label: "Vinhetas", type: "number", default: 300, unit: "ms" },
        { key: "mixDemais", label: "Demais inserções", type: "number", default: 500, unit: "ms" },
        { key: "mixLocucoes", label: "Locuções", type: "number", default: 600, unit: "ms" },
        {
          key: "mixHoraCerta",
          label: "Hora-certa/temperatura",
          type: "number",
          default: 400,
          unit: "ms",
        },
        { key: "mixRefrao", label: "Refrão", type: "number", default: 500, unit: "ms" },
        {
          key: "fadeInRefrao",
          label: "Fade in para refrão",
          type: "number",
          default: 300,
          unit: "ms",
        },
        {
          key: "fadeOutRefrao",
          label: "Fade out para refrão",
          type: "number",
          default: 300,
          unit: "ms",
        },
        {
          key: "fadeManual",
          label: "Fade nas passagens manuais",
          type: "number",
          default: 400,
          unit: "ms",
        },
      ],
    },
    {
      id: "deteccaoPontos",
      title: "Detecção automática de pontos (segue)",
      note: "Analisa cada faixa para achar o início e o fim reais do áudio, cortando silêncios e mixando exatamente no ponto certo — como nos automadores profissionais.",
      fields: [
        sw("detectarPontos", "Detectar automaticamente início/fim das faixas", true),
        sw("crossEqualPower", "Mixagem de potência constante (equal-power)", true),
        {
          key: "cueThresholdDb",
          label: "Sensibilidade de silêncio",
          type: "number",
          default: 45,
          unit: "dB",
          min: 20,
          max: 70,
        },
      ],
    },
    {
      id: "fadeAuto",
      title: "Fade automático",
      fields: [
        sw("fadeQuickstart", "Fade para QuickStart", true),
        sw("fadeLocucoes", "Fade para locuções", true),
        sw("fadeCarimbos", "Fade para carimbos", true),
        sw("fadeTocarPasta", "Fade ao tocar da pasta", true),
        {
          key: "percentFade",
          label: "Percentual de fade",
          type: "number",
          default: 40,
          unit: "%",
          min: 0,
          max: 100,
        },
        sw("fadeEntradaLinha", "Aplicar fade na entrada de linha", false),
        {
          key: "volEntrada",
          label: "Volume da entrada de áudio ao tocar",
          type: "number",
          default: 30,
          unit: "%",
          min: 0,
          max: 100,
        },
      ],
    },
    {
      id: "marcMusicas",
      title: "Músicas",
      fields: [
        sw("musMarcMix", "Usar marcadores de ponto de mixagem", true),
        sw("musMarcInicio", "Usar marcadores de mixagem do início", true),
        sw("musFadeOut", "Fade out automático para as músicas", true),
        sw("musPausaIndisponivel", "Pausa em música programada mas não disponível", false),
        {
          key: "musSenhaRemover",
          label: "Senha para remover música",
          type: "password",
          default: "",
        },
        {
          key: "musNomenclatura",
          label: "Padrão de nomenclatura",
          type: "select",
          default: "artista_musica",
          options: [
            { value: "artista_musica", label: "Artista - Música" },
            { value: "musica_artista", label: "Música - Artista" },
          ],
        },
      ],
    },
    {
      id: "marcComerciais",
      title: "Comerciais",
      fields: [
        sw("comMarcMix", "Usar marcadores de ponto de mixagem", true),
        sw("comMarcInicio", "Usar marcadores de mixagem do início", true),
        {
          key: "comSenhaRemover",
          label: "Senha para remover comercial",
          type: "password",
          default: "",
        },
      ],
    },
    {
      id: "marcVinhetas",
      title: "Vinhetas",
      fields: [
        sw("vinMarcMix", "Usar marcadores de ponto de mixagem", true),
        sw("vinMarcInicio", "Usar marcadores de mixagem do início", true),
        sw("vinFadeOut", "Fade out automático para as vinhetas", true),
      ],
    },
    {
      id: "marcLocucoes",
      title: "Locuções Gravadas",
      fields: [
        sw("locInserir", "Inserir locução pré-gravada", true),
        sw("locSobreIntro", "Locução sobre introdução", true),
        sw("locMarcMix", "Usar marcadores de ponto de mixagem", true),
        sw("locMarcInicio", "Usar marcadores de mixagem do início", true),
      ],
    },
    {
      id: "marcHoraCerta",
      title: "Hora-certa / temperatura",
      fields: [
        sw("hcMarcMix", "Usar marcadores de ponto de mixagem", true),
        sw("hcMarcInicio", "Usar marcadores de mixagem do início", true),
      ],
    },
  ],
};

// ---- Guia Licença ----
const guiaLicenca: ConfigGuide = {
  id: "licenca",
  title: "Licença",
  sections: [
    {
      id: "licenca",
      title: "Dados da licença",
      fields: [
        {
          key: "licNumero",
          label: "Número da licença",
          type: "text",
          default: "DEMO-0000-0000-0000",
        },
        { key: "licEmissora", label: "Emissora", type: "text", default: "Estação Demo FM" },
        { key: "licCidade", label: "Cidade / Estado", type: "text", default: "São Paulo - SP" },
        { key: "licPais", label: "País", type: "text", default: "Brasil" },
        { key: "licContato", label: "Contato técnico", type: "text", default: "Operador Demo" },
      ],
    },
  ],
};

function outOpts() {
  return [
    { value: "principal", label: "Saída principal (AR)" },
    { value: "fones", label: "Fones / Monitor" },
    { value: "secundaria", label: "Placa secundária" },
    { value: "virtual", label: "Cabo virtual" },
  ];
}

const guiaRds: ConfigGuide = {
  id: "rds",
  title: "RDS",
  sections: [
    (guiaConfiguracoes.sections.find((s) => s.id === "rds") as ConfigSection),
  ],
};

export const configGuides: ConfigGuide[] = [
  guiaGeral,
  guiaConfiguracoes,
  guiaRds,
  guiaInsercoes,
  guiaLicenca,
];

// ----- Persistência (localStorage) -----
export type ConfigValue = string | number | boolean;
export type ConfigState = Record<string, ConfigValue>;

const STORAGE_KEY = "solutions-play-config";

export function defaultConfig(): ConfigState {
  const out: ConfigState = {};
  for (const g of configGuides)
    for (const s of g.sections)
      for (const f of s.fields) out[`${g.id}.${s.id}.${f.key}`] = f.default;
  return out;
}

export function loadConfig(): ConfigState {
  const base = defaultConfig();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) Object.assign(base, JSON.parse(raw));
  } catch {
    /* ignore */
  }
  return base;
}

export function saveConfig(state: ConfigState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

// ---- Exportação / Importação de configurações em arquivo ----

const EXPORT_VERSION = 1;
const EXPORT_KIND = "solutions-play-config";

// Conjunto de chaves válidas conhecidas pelo esquema atual.
function knownKeys(): Set<string> {
  return new Set(Object.keys(defaultConfig()));
}

// Gera o conteúdo (JSON) do arquivo de configurações.
export function exportConfig(state: ConfigState): string {
  const payload = {
    kind: EXPORT_KIND,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    config: state,
  };
  return JSON.stringify(payload, null, 2);
}

export interface ImportResult {
  state: ConfigState;
  applied: number;
  ignored: string[];
}

// Lê o conteúdo de um arquivo exportado e mescla sobre os padrões atuais.
// Aceita tanto o formato com envelope { kind, version, config } quanto um
// objeto plano de chaves -> valor (compatibilidade).
export function importConfig(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Arquivo inválido: não é um JSON válido.");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Arquivo inválido: conteúdo inesperado.");
  }

  const obj = parsed as Record<string, unknown>;
  let raw: Record<string, unknown>;
  if (obj.kind === EXPORT_KIND || obj.config) {
    if (obj.kind && obj.kind !== EXPORT_KIND) {
      throw new Error("Arquivo inválido: não é um arquivo de configurações do Solutions-Play.");
    }
    raw = (obj.config as Record<string, unknown>) ?? {};
  } else {
    raw = obj; // objeto plano (compatibilidade)
  }

  const valid = knownKeys();
  const state = defaultConfig();
  const ignored: string[] = [];
  let applied = 0;
  for (const [k, v] of Object.entries(raw)) {
    if (!valid.has(k)) {
      ignored.push(k);
      continue;
    }
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      state[k] = v;
      applied++;
    } else {
      ignored.push(k);
    }
  }
  if (!applied) throw new Error("Nenhuma configuração compatível encontrada no arquivo.");
  return { state, applied, ignored };
}
