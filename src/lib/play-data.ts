// Mídias reais importadas via ponteiros de ativos (Assets).
import anaCastelaAsset from "@/assets/ana_castela.asset.json";
import claytonRomarioAsset from "@/assets/clayton_romario.asset.json";
import daniloDaviApagaAsset from "@/assets/danilo_davi_apaga.asset.json";
import daniloDaviGavetasAsset from "@/assets/danilo_davi_gavetas.asset.json";
import diegoVictorAsset from "@/assets/diego_victor.asset.json";
import felipeRodrigoGostaAsset from "@/assets/felipe_rodrigo_gosta_de_rua.asset.json";
import felipeRodrigoIgnoraAsset from "@/assets/felipe_rodrigo_ignora.asset.json";
import ferrugemArrependidacoAsset from "@/assets/ferrugem_arrependidaco.asset.json";
import menosMaisBrindaAsset from "@/assets/menos_mais_brinda_ae.asset.json";
import menosMaisChampanheAsset from "@/assets/menos_mais_champanhe.asset.json";
import menosMaisCoracaoAsset from "@/assets/menos_mais_coracao_partido.asset.json";
import menosMaisPPecadoAsset from "@/assets/menos_mais_p_pecado.asset.json";
import menosMaisUltimaVezAsset from "@/assets/menos_mais_pela_ultima_vez.asset.json";
import menosMaisSaudadeAsset from "@/assets/menos_mais_saudade_inconveniente.asset.json";
import guilhermeBenutoAsset from "@/assets/audio/guilherme_benuto_eu_duvido.mp3.asset.json";
import gusttavoLimaBalaAsset from "@/assets/audio/gusttavo_lima_bala_alojada.mp3.asset.json";
import gusttavoLimaRetrovisorAsset from "@/assets/audio/gusttavo_lima_retrovisor.mp3.asset.json";
import henriqueJulianoAmigoAsset from "@/assets/audio/henrique_juliano_amigo_da_minha_saudade.mp3.asset.json";
import henriqueJulianoSejaExAsset from "@/assets/audio/henrique_juliano_seja_ex.mp3.asset.json";
import henriqueJulianoUltimaAsset from "@/assets/audio/henrique_juliano_ultima_saudade.mp3.asset.json";
import jeninhoPeaoAsset from "@/assets/audio/jeninho_peao_todo_tatuado.mp3.asset.json";
import jorgeMateusCantadaAsset from "@/assets/audio/jorge_mateus_cantada_boba.mp3.asset.json";
import jorgeMateusXoneiAsset from "@/assets/audio/jorge_mateus_xonei.mp3.asset.json";
import juniorCezarCheiroAsset from "@/assets/audio/junior_cezar_cheiro_de_culpado.mp3.asset.json";
import lauanaPradoSaudadeAsset from "@/assets/audio/lauana_prado_saudade_burra.mp3.asset.json";
import luanSantanaOlhoAsset from "@/assets/audio/luan_santana_olho_marrom.mp3.asset.json";
import mariFernandezAsset from "@/assets/audio/mari_fernandez_saudade.mp3.asset.json";
import matheusKauanAsset from "@/assets/audio/matheus_kauan_ilusao.mp3.asset.json";
import mjRecordsAsset from "@/assets/audio/mj_records_inseguranca.mp3.asset.json";
import muriloHuffEstranhaAsset from "@/assets/audio/murilo_huff_saudade_estranha.mp3.asset.json";
import muriloHuffSoComElaAsset from "@/assets/audio/murilo_huff_so_com_ela.mp3.asset.json";
import pandaBaqueadoAsset from "@/assets/tracks/panda-baqueado.mp3.asset.json";
import pandaCalcinhaAsset from "@/assets/tracks/panda-calcinha.mp3.asset.json";
import pandaEuTeSeguroAsset from "@/assets/tracks/panda-eu-te-seguro.mp3.asset.json";
import racionaisNegroDramaAsset from "@/assets/tracks/racionais-negro-drama.mp3.asset.json";
import rafaAmaMaloqueiroAsset from "@/assets/tracks/rafa-ama-maloqueiro.mp3.asset.json";
import simoneErroGostosoAsset from "@/assets/tracks/simone-erro-gostoso.mp3.asset.json";
import turmaPagodeBebeAsset from "@/assets/tracks/turma-pagode-bebe.mp3.asset.json";
import vitinhoApaixoneiAsset from "@/assets/tracks/vitinho-apaixonei.mp3.asset.json";
import zeNetoBarulhoAsset from "@/assets/tracks/ze-neto-barulho.mp3.asset.json";
import zeNetoCadeiraAsset from "@/assets/tracks/ze-neto-cadeira.mp3.asset.json";




// Demo data for Solutions-Play (local demo mode, no backend).

export type Category = "musical" | "comercial" | "vinheta" | "texto";

// Special program items that are not normal audio (manual p.15).
export type TrackKind = "audio" | "pausa" | "horacerta" | "textodia" | "locucao";
// Origin of an insertion, used to show the M marker (manual p.14-15).
export type TrackOrigin = "auto" | "manual";

export interface Track {
  id: string;
  title: string;
  artist?: string;
  duration: number; // seconds
  category: Category;
  freq: number; // synth root frequency
  album?: string;
  year?: string;
  label?: string;
  kind?: TrackKind;
  origin?: TrackOrigin; // "manual" = blue M; auto + moved = red M
  moved?: boolean;
  body?: string; // Texto do dia (manual p.36): conteúdo lido automaticamente.
  audioUrl?: string; // Locução gravada / áudio embutido na inserção (manual p.111-112).
  filePath?: string; // Caminho no Windows (atalho de pasta) — resolvido sob demanda.
}

export interface Block {
  id: string;
  title: string;
  date: string;
  time: string;
  category: "musical" | "comercial";
  items: Track[];
  clock?: BlockClock;
}

// Relógio Operacional (manual p.137-142): parâmetros por bloco.
export interface BlockClock {
  name?: string; // Parâmetro ID — nome personalizado do bloco
  fixo?: boolean; // Parâmetro FIXO — F amarelo, não pode atrasar
  mode?: "local" | "sat"; // Parâmetros LOCAL e SAT
  dur?: number; // Parâmetro DUR — duração alvo em minutos
  locked?: boolean; // Parâmetro LOCKED — cadeado amarelo, bloqueia edição
  descarte?: boolean; // Parâmetro DESCARTE — aplica cálculo de descarte no bloco
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  category: Category;
  code: string;
  tracks: Track[];
}

let _id = 0;
const uid = () => `t${++_id}`;

const mk = (
  title: string,
  artist: string,
  duration: number,
  category: Category,
  freq: number,
  extra: Partial<Track> = {},
): Track => ({
  id: uid(),
  title,
  artist,
  duration,
  category,
  freq,
  kind: "audio",
  origin: "auto",
  ...extra,
});

// Formatação compartilhada da data da programação. Este bloco fica antes da
// grade inicial porque é executado durante a inicialização do módulo.
const weekdays = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

export function todayLabel(d = new Date()): string {
  const dd = d.getDate().toString().padStart(2, "0");
  const mm = (d.getMonth() + 1).toString().padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()} (${weekdays[d.getDay()]})`;
}

// A programação demonstrativa deve sempre abrir como a programação do dia atual.
// O gerador/importador também usa todayLabel(); manter o mesmo padrão evita
// que o Final Log inicial apareça com uma data antiga fixa.
const initialProgramDate = todayLabel();

export const initialBlocks: Block[] = [
  {
    id: "b1",
    title: "Musical",
    date: initialProgramDate,
    time: "13:00",
    category: "musical",
    items: [
      mk("Olha Onde Eu Tô", "Ana Castela", 186, "musical", 220, {
        album: "Solteiro Forçado",
        year: "2023",
        audioUrl: anaCastelaAsset.url,
      }),
      mk("Não Namora (Ao Vivo)", "Clayton & Romário", 147, "musical", 196, {
        album: "No Churrasco",
        year: "2023",
        audioUrl: claytonRomarioAsset.url,
      }),
      mk("Brinda Aê (Ao Vivo)", "Grupo Menos É Mais", 175, "musical", 188, {
        album: "Confia",
        year: "2023",
        audioUrl: menosMaisBrindaAsset.url,
      }),
      mk("Gosta De Rua (Ao Vivo)", "Felipe e Rodrigo", 160, "musical", 210, {
        album: "Ao Vivo",
        year: "2024",
        audioUrl: felipeRodrigoGostaAsset.url,
      }),
      mk("Champanhe (Ao Vivo)", "Grupo Menos É Mais", 158, "musical", 172, {
        album: "Confia",
        year: "2023",
        audioUrl: menosMaisChampanheAsset.url,
      }),
      mk("Ignora (Ao Vivo)", "Felipe e Rodrigo", 150, "musical", 246, {
        album: "Ao Vivo",
        year: "2024",
        audioUrl: felipeRodrigoIgnoraAsset.url,
      }),
      mk("Coração Partido (Ao Vivo)", "Grupo Menos É Mais", 192, "musical", 220, {
        album: "Confia",
        year: "2023",
        audioUrl: menosMaisCoracaoAsset.url,
      }),
      mk("Arrependidaço (Onde Você Anda)", "Ferrugem", 180, "musical", 210, {
        album: "Pagode do Ferrugem",
        year: "2024",
        audioUrl: ferrugemArrependidacoAsset.url,
      }),
      mk("P do Pecado (Ao Vivo)", "Grupo Menos É Mais", 164, "musical", 246, {
        album: "Confia",
        year: "2023",
        audioUrl: menosMaisPPecadoAsset.url,
      }),
      mk("Apaga Apaga Apaga (Ao Vivo)", "Danilo e Davi", 190, "musical", 174, {
        album: "Pra Beber e Chorar",
        year: "2023",
        audioUrl: daniloDaviApagaAsset.url,
      }),
      mk("Pela Última Vez (Ao Vivo)", "Grupo Menos É Mais", 170, "musical", 220, {
        album: "Confia",
        year: "2023",
        audioUrl: menosMaisUltimaVezAsset.url,
      }),
      mk("Não Mexe nas Minhas Gavetas (Ao Vivo)", "Danilo e Davi", 136, "musical", 246, {
        album: "Pra Beber e Chorar",
        year: "2023",
        audioUrl: daniloDaviGavetasAsset.url,
      }),
      mk("Saudade Inconveniente (Ao Vivo)", "Grupo Menos É Mais", 185, "musical", 174, {
        album: "Confia",
        year: "2023",
        audioUrl: menosMaisSaudadeAsset.url,
      }),
      mk("Tubarões (Ao Vivo)", "Diego & Victor Hugo", 172, "musical", 261, {
        album: "Beco do Flashback",
        year: "2023",
        audioUrl: diegoVictorAsset.url,
      }),
      mk("Eu Duvido (Ao Vivo)", "Guilherme & Benuto", 168, "musical", 220, {
        album: "Ao Vivo",
        year: "2024",
        audioUrl: guilhermeBenutoAsset.url,
      }),
      mk("Bala Alojada", "Gusttavo Lima", 175, "musical", 196, {
        album: "Paraíso Particular",
        year: "2024",
        audioUrl: gusttavoLimaBalaAsset.url,
      }),
      mk("Retrovisor", "Gusttavo Lima", 182, "musical", 188, {
        album: "Paraíso Particular",
        year: "2024",
        audioUrl: gusttavoLimaRetrovisorAsset.url,
      }),
      mk("Amigo Da Minha Saudade (Ao Vivo)", "Henrique & Juliano", 190, "musical", 210, {
        album: "Manifesto Musical",
        year: "2024",
        audioUrl: henriqueJulianoAmigoAsset.url,
      }),
      mk("Seja Ex (Ao Vivo)", "Henrique & Juliano", 155, "musical", 172, {
        album: "Manifesto Musical",
        year: "2024",
        audioUrl: henriqueJulianoSejaExAsset.url,
      }),
      mk("Última Saudade (Ao Vivo)", "Henrique & Juliano", 188, "musical", 246, {
        album: "Manifesto Musical",
        year: "2024",
        audioUrl: henriqueJulianoUltimaAsset.url,
      }),
      mk("Peão Todo Tatuado", "Jeninho", 145, "musical", 220, {
        album: "Solteiro",
        year: "2024",
        audioUrl: jeninhoPeaoAsset.url,
      }),
      mk("Cantada Boba (Ao Vivo)", "Jorge & Mateus", 162, "musical", 196, {
        album: "Ao Vivo",
        year: "2024",
        audioUrl: jorgeMateusCantadaAsset.url,
      }),
      mk("Xonei", "Jorge & Mateus", 155, "musical", 188, {
        album: "Xonei",
        year: "2024",
        audioUrl: jorgeMateusXoneiAsset.url,
      }),
      mk("Cheiro De Culpado (Ao Vivo)", "Júnior e Cézar", 148, "musical", 210, {
        album: "Ao Vivo",
        year: "2024",
        audioUrl: juniorCezarCheiroAsset.url,
      }),
      mk("Saudade Burra (Ao Vivo)", "Lauana Prado", 172, "musical", 172, {
        album: "Ao Vivo",
        year: "2024",
        audioUrl: lauanaPradoSaudadeAsset.url,
      }),
      mk("OLHO MARROM (Ao Vivo)", "Luan Santana", 185, "musical", 246, {
        album: "Ao Vivo em Lisboa",
        year: "2024",
        audioUrl: luanSantanaOlhoAsset.url,
      }),
      mk("Saudade do Carai", "Mari Fernandez", 178, "musical", 220, {
        album: "Ao Vivo",
        year: "2024",
        audioUrl: mariFernandezAsset.url,
      }),
      mk("Ilusão De Ótica (Ao Vivo)", "Matheus & Kauan", 165, "musical", 196, {
        album: "Praiou",
        year: "2024",
        audioUrl: matheusKauanAsset.url,
      }),
      mk("Insegurança / Fim de Noite (Ao Vivo)", "Mj Records", 210, "musical", 188, {
        album: "Ao Vivo",
        year: "2024",
        audioUrl: mjRecordsAsset.url,
      }),
      mk("Saudade Estranha (Ao Vivo)", "Murilo Huff", 192, "musical", 210, {
        album: "Ao Vivo",
        year: "2024",
        audioUrl: muriloHuffEstranhaAsset.url,
      }),
      mk("Só Com Ela (Ao Vivo)", "Murilo Huff", 180, "musical", 172, {
        album: "Ao Vivo",
        year: "2024",
        audioUrl: muriloHuffSoComElaAsset.url,
      }),
      mk("Baqueado (Ao Vivo)", "Panda", 192, "musical", 188, {
        album: "Ao Vivo",
        year: "2024",
        audioUrl: pandaBaqueadoAsset.url,
      }),
      mk("Calcinha de Renda (Ao Vivo)", "Panda", 175, "musical", 210, {
        album: "Ao Vivo",
        year: "2024",
        audioUrl: pandaCalcinhaAsset.url,
      }),
      mk("Eu Te Seguro (Ao Vivo)", "Panda", 168, "musical", 172, {
        album: "Ao Vivo",
        year: "2024",
        audioUrl: pandaEuTeSeguroAsset.url,
      }),
      mk("Negro Drama", "Racionais MC's", 412, "musical", 246, {
        album: "Nada como um dia após o outro dia",
        year: "2002",
        audioUrl: racionaisNegroDramaAsset.url,
      }),
      mk("Ama Um Maloqueiro", "Rafa e Junior", 180, "musical", 220, {
        album: "Single",
        year: "2024",
        audioUrl: rafaAmaMaloqueiroAsset.url,
      }),
      mk("Erro Gostoso (Ao Vivo)", "Simone Mendes", 195, "musical", 196, {
        album: "Cintilante",
        year: "2023",
        audioUrl: simoneErroGostosoAsset.url,
      }),
      mk("Bebe e Vem Me Procurar / Quem Ama Sente Saudade", "Turma do Pagode", 215, "musical", 188, {
        album: "Ao Vivo",
        year: "2024",
        audioUrl: turmaPagodeBebeAsset.url,
      }),
      mk("Eu Me Apaixonei", "Vitinho Imperador", 168, "musical", 210, {
        album: "Single",
        year: "2024",
        audioUrl: vitinhoApaixoneiAsset.url,
      }),
      mk("Barulho Do Foguete (Ao Vivo)", "Zé Neto & Cristiano", 175, "musical", 172, {
        album: "Escolhas",
        year: "2023",
        audioUrl: zeNetoBarulhoAsset.url,
      }),
      mk("Cadeira Cativa (Ao Vivo)", "Zé Neto & Cristiano", 182, "musical", 246, {
        album: "Escolhas",
        year: "2023",
        audioUrl: zeNetoCadeiraAsset.url,
      }),

    ],
  },
  {
    id: "b2",
    title: "Comercial",
    date: initialProgramDate,
    time: "13:18",
    category: "comercial",
    items: [
      mk("VH Hora Certa", "Solutions", 9, "vinheta", 330),
      mk("Spot Padaria Aurora", "Comercial", 32, "comercial", 165),
      mk("VH Estabilidade", "Solutions", 6, "vinheta", 392),
      mk("Promo Sorteio do Ouvinte", "Comercial", 28, "comercial", 147),
      mk("VH Solutions PAS", "Solutions", 5, "vinheta", 440),
    ],
  },
  {
    id: "b3",
    title: "Musical",
    date: initialProgramDate,
    time: "13:30",
    category: "musical",
    items: [
      mk("Olha Onde Eu Tô", "Ana Castela", 186, "musical", 233, {
        audioUrl: anaCastelaAsset.url,
      }),
      mk("Tubarões (Ao Vivo)", "Diego & Victor Hugo", 172, "musical", 277, {
        audioUrl: diegoVictorAsset.url,
      }),
      mk("Não Namora (Ao Vivo)", "Clayton & Romário", 147, "musical", 185, {
        audioUrl: claytonRomarioAsset.url,
      }),
      mk("Bebe e Vem Me Procurar / Quem Ama Sente Saudade", "Turma do Pagode", 215, "musical", 188, { audioUrl: turmaPagodeBebeAsset.url }),
      mk("Eu Me Apaixonei", "Vitinho Imperador", 168, "musical", 210, { audioUrl: vitinhoApaixoneiAsset.url }),
      mk("Barulho Do Foguete (Ao Vivo)", "Zé Neto & Cristiano", 175, "musical", 172, { audioUrl: zeNetoBarulhoAsset.url }),
      mk("Cadeira Cativa (Ao Vivo)", "Zé Neto & Cristiano", 182, "musical", 246, { audioUrl: zeNetoCadeiraAsset.url }),
    ],
  },
];

export const folders: Folder[] = [
  {
    id: "f1",
    name: "Acervo de Vídeos",
    color: "#c0392b",
    category: "musical",
    code: "ACV",
    tracks: [
      mk("Olha Onde Eu Tô", "Ana Castela", 186, "musical", 220, { audioUrl: anaCastelaAsset.url }),
      mk("Brinda Aê (Ao Vivo)", "Grupo Menos É Mais", 175, "musical", 188, { audioUrl: menosMaisBrindaAsset.url }),
      mk("Gosta De Rua (Ao Vivo)", "Felipe e Rodrigo", 160, "musical", 188, { audioUrl: felipeRodrigoGostaAsset.url }),
      mk("Não Namora (Ao Vivo)", "Clayton & Romário", 147, "musical", 246, { audioUrl: claytonRomarioAsset.url }),
      mk("Champanhe (Ao Vivo)", "Grupo Menos É Mais", 158, "musical", 172, { audioUrl: menosMaisChampanheAsset.url }),
      mk("Ignora (Ao Vivo)", "Felipe e Rodrigo", 150, "musical", 172, { audioUrl: felipeRodrigoIgnoraAsset.url }),
      mk("Tubarões (Ao Vivo)", "Diego & Victor Hugo", 172, "musical", 174, { audioUrl: diegoVictorAsset.url }),
      mk("Eu Duvido (Ao Vivo)", "Guilherme & Benuto", 168, "musical", 220, { audioUrl: guilhermeBenutoAsset.url }),
      mk("Bala Alojada", "Gusttavo Lima", 175, "musical", 196, { audioUrl: gusttavoLimaBalaAsset.url }),
      mk("Retrovisor", "Gusttavo Lima", 182, "musical", 188, { audioUrl: gusttavoLimaRetrovisorAsset.url }),
      mk("Amigo Da Minha Saudade (Ao Vivo)", "Henrique & Juliano", 190, "musical", 210, { audioUrl: henriqueJulianoAmigoAsset.url }),
      mk("Seja Ex (Ao Vivo)", "Henrique & Juliano", 155, "musical", 172, { audioUrl: henriqueJulianoSejaExAsset.url }),
      mk("Última Saudade (Ao Vivo)", "Henrique & Juliano", 188, "musical", 246, { audioUrl: henriqueJulianoUltimaAsset.url }),
      mk("Peão Todo Tatuado", "Jeninho", 145, "musical", 220, { audioUrl: jeninhoPeaoAsset.url }),
      mk("Cantada Boba (Ao Vivo)", "Jorge & Mateus", 162, "musical", 196, { audioUrl: jorgeMateusCantadaAsset.url }),
      mk("Xonei", "Jorge & Mateus", 155, "musical", 188, { audioUrl: jorgeMateusXoneiAsset.url }),
      mk("Cheiro De Culpado (Ao Vivo)", "Júnior e Cézar", 148, "musical", 210, { audioUrl: juniorCezarCheiroAsset.url }),
      mk("Saudade Burra (Ao Vivo)", "Lauana Prado", 172, "musical", 172, { audioUrl: lauanaPradoSaudadeAsset.url }),
      mk("OLHO MARROM (Ao Vivo)", "Luan Santana", 185, "musical", 246, { audioUrl: luanSantanaOlhoAsset.url }),
      mk("Saudade do Carai", "Mari Fernandez", 178, "musical", 220, { audioUrl: mariFernandezAsset.url }),
      mk("Ilusão De Ótica (Ao Vivo)", "Matheus & Kauan", 165, "musical", 196, { audioUrl: matheusKauanAsset.url }),
      mk("Insegurança / Fim de Noite (Ao Vivo)", "Mj Records", 210, "musical", 188, { audioUrl: mjRecordsAsset.url }),
      mk("Saudade Estranha (Ao Vivo)", "Murilo Huff", 192, "musical", 210, { audioUrl: muriloHuffEstranhaAsset.url }),
      mk("Só Com Ela (Ao Vivo)", "Murilo Huff", 180, "musical", 172, { audioUrl: muriloHuffSoComElaAsset.url }),
      mk("Coração Partido (Ao Vivo)", "Grupo Menos É Mais", 192, "musical", 220, { audioUrl: menosMaisCoracaoAsset.url }),
      mk("Arrependidaço (Onde Você Anda)", "Ferrugem", 180, "musical", 210, { audioUrl: ferrugemArrependidacoAsset.url }),
      mk("P do Pecado (Ao Vivo)", "Grupo Menos É Mais", 164, "musical", 246, { audioUrl: menosMaisPPecadoAsset.url }),
      mk("Baqueado (Ao Vivo)", "Panda", 192, "musical", 188, { audioUrl: pandaBaqueadoAsset.url }),
      mk("Calcinha de Renda (Ao Vivo)", "Panda", 175, "musical", 210, { audioUrl: pandaCalcinhaAsset.url }),
      mk("Eu Te Seguro (Ao Vivo)", "Panda", 168, "musical", 172, { audioUrl: pandaEuTeSeguroAsset.url }),
      mk("Negro Drama", "Racionais MC's", 412, "musical", 246, { audioUrl: racionaisNegroDramaAsset.url }),
      mk("Ama Um Maloqueiro", "Rafa e Junior", 180, "musical", 220, { audioUrl: rafaAmaMaloqueiroAsset.url }),
      mk("Erro Gostoso (Ao Vivo)", "Simone Mendes", 195, "musical", 196, { audioUrl: simoneErroGostosoAsset.url }),
      mk("Barulho Do Foguete (Ao Vivo)", "Zé Neto & Cristiano", 175, "musical", 172, { audioUrl: zeNetoBarulhoAsset.url }),
      mk("Cadeira Cativa (Ao Vivo)", "Zé Neto & Cristiano", 182, "musical", 246, { audioUrl: zeNetoCadeiraAsset.url }),
    ],
  },
  {
    id: "f2",
    name: "MPB",
    color: "#27ae60",
    category: "musical",
    code: "NAC",
    tracks: [
      mk("Apaga Apaga Apaga (Ao Vivo)", "Danilo e Davi", 190, "musical", 196, { audioUrl: daniloDaviApagaAsset.url }),
      mk("Gosta De Rua (Ao Vivo)", "Felipe e Rodrigo", 160, "musical", 188, { audioUrl: felipeRodrigoGostaAsset.url }),
      mk("Pela Última Vez (Ao Vivo)", "Grupo Menos É Mais", 170, "musical", 220, { audioUrl: menosMaisUltimaVezAsset.url }),
      mk("Não Mexe nas Minhas Gavetas (Ao Vivo)", "Danilo e Davi", 136, "musical", 165, { audioUrl: daniloDaviGavetasAsset.url }),
      mk("Saudade Inconveniente (Ao Vivo)", "Grupo Menos É Mais", 185, "musical", 174, { audioUrl: menosMaisSaudadeAsset.url }),
      mk("Olha Onde Eu Tô", "Ana Castela", 186, "musical", 207, { audioUrl: anaCastelaAsset.url }),
      mk("Amigo Da Minha Saudade (Ao Vivo)", "Henrique & Juliano", 190, "musical", 210, { audioUrl: henriqueJulianoAmigoAsset.url }),
      mk("Retrovisor", "Gusttavo Lima", 182, "musical", 188, { audioUrl: gusttavoLimaRetrovisorAsset.url }),
      mk("Ilusão De Ótica (Ao Vivo)", "Matheus & Kauan", 165, "musical", 196, { audioUrl: matheusKauanAsset.url }),
      mk("Saudade Estranha (Ao Vivo)", "Murilo Huff", 192, "musical", 210, { audioUrl: muriloHuffEstranhaAsset.url }),
      mk("Cantada Boba (Ao Vivo)", "Jorge & Mateus", 162, "musical", 196, { audioUrl: jorgeMateusCantadaAsset.url }),
      mk("Saudade Burra (Ao Vivo)", "Lauana Prado", 172, "musical", 172, { audioUrl: lauanaPradoSaudadeAsset.url }),

      mk("Negro Drama", "Racionais MC's", 412, "musical", 246, { audioUrl: racionaisNegroDramaAsset.url }),
      mk("Erro Gostoso (Ao Vivo)", "Simone Mendes", 195, "musical", 196, { audioUrl: simoneErroGostosoAsset.url }),
      mk("Ama Um Maloqueiro", "Rafa e Junior", 180, "musical", 220, { audioUrl: rafaAmaMaloqueiroAsset.url }),
      mk("Bebe e Vem Me Procurar / Quem Ama Sente Saudade", "Turma do Pagode", 215, "musical", 188, { audioUrl: turmaPagodeBebeAsset.url }),
      mk("Eu Me Apaixonei", "Vitinho Imperador", 168, "musical", 210, { audioUrl: vitinhoApaixoneiAsset.url }),
    ],
  },
  {
    id: "f3",
    name: "Flash Back",
    color: "#2980b9",
    category: "musical",
    code: "FB",
    tracks: [
      mk("Arrependidaço (Onde Você Anda)", "Ferrugem", 180, "musical", 210, { audioUrl: ferrugemArrependidacoAsset.url }),
      mk("Brinda Aê (Ao Vivo)", "Grupo Menos É Mais", 175, "musical", 188, { audioUrl: menosMaisBrindaAsset.url }),
      mk("Não Namora (Ao Vivo)", "Clayton & Romário", 147, "musical", 261, { audioUrl: claytonRomarioAsset.url }),
      mk("Champanhe (Ao Vivo)", "Grupo Menos É Mais", 158, "musical", 172, { audioUrl: menosMaisChampanheAsset.url }),
      mk("Tubarões (Ao Vivo)", "Diego & Victor Hugo", 172, "musical", 233, { audioUrl: diegoVictorAsset.url }),
      mk("Eu Duvido (Ao Vivo)", "Guilherme & Benuto", 168, "musical", 220, { audioUrl: guilhermeBenutoAsset.url }),
      mk("Seja Ex (Ao Vivo)", "Henrique & Juliano", 155, "musical", 172, { audioUrl: henriqueJulianoSejaExAsset.url }),
      mk("Saudade do Carai", "Mari Fernandez", 178, "musical", 220, { audioUrl: mariFernandezAsset.url }),
      mk("Só Com Ela (Ao Vivo)", "Murilo Huff", 180, "musical", 172, { audioUrl: muriloHuffSoComElaAsset.url }),
      mk("Peão Todo Tatuado", "Jeninho", 145, "musical", 220, { audioUrl: jeninhoPeaoAsset.url }),
      mk("Xonei", "Jorge & Mateus", 155, "musical", 188, { audioUrl: jorgeMateusXoneiAsset.url }),
      mk("Baqueado (Ao Vivo)", "Panda", 192, "musical", 188, { audioUrl: pandaBaqueadoAsset.url }),
      mk("Calcinha de Renda (Ao Vivo)", "Panda", 175, "musical", 210, { audioUrl: pandaCalcinhaAsset.url }),
      mk("Eu Te Seguro (Ao Vivo)", "Panda", 168, "musical", 172, { audioUrl: pandaEuTeSeguroAsset.url }),
      mk("Coração Partido (Ao Vivo)", "Grupo Menos É Mais", 192, "musical", 220, { audioUrl: menosMaisCoracaoAsset.url }),
      mk("Apaga Apaga Apaga (Ao Vivo)", "Danilo e Davi", 190, "musical", 196, { audioUrl: daniloDaviApagaAsset.url }),
    ],
  },
  {
    id: "f4",
    name: "Hit Parade",
    color: "#8e44ad",
    category: "musical",
    code: "INTER",
    tracks: [
      mk("Olha Onde Eu Tô", "Ana Castela", 186, "musical", 277, { audioUrl: anaCastelaAsset.url }),
      mk("P do Pecado (Ao Vivo)", "Grupo Menos É Mais", 164, "musical", 246, { audioUrl: menosMaisPPecadoAsset.url }),
      mk("Ignora (Ao Vivo)", "Felipe e Rodrigo", 150, "musical", 172, { audioUrl: felipeRodrigoIgnoraAsset.url }),
      mk("Pela Última Vez (Ao Vivo)", "Grupo Menos É Mais", 170, "musical", 220, { audioUrl: menosMaisUltimaVezAsset.url }),
      mk("Não Mexe nas Minhas Gavetas (Ao Vivo)", "Danilo e Davi", 136, "musical", 246, { audioUrl: daniloDaviGavetasAsset.url }),
      mk("Saudade Inconveniente (Ao Vivo)", "Grupo Menos É Mais", 185, "musical", 174, { audioUrl: menosMaisSaudadeAsset.url }),
      mk("Tubarões (Ao Vivo)", "Diego & Victor Hugo", 172, "musical", 220, { audioUrl: diegoVictorAsset.url }),
      mk("Bala Alojada", "Gusttavo Lima", 175, "musical", 196, { audioUrl: gusttavoLimaBalaAsset.url }),
      mk("Última Saudade (Ao Vivo)", "Henrique & Juliano", 188, "musical", 246, { audioUrl: henriqueJulianoUltimaAsset.url }),
      mk("Insegurança / Fim de Noite (Ao Vivo)", "Mj Records", 210, "musical", 188, { audioUrl: mjRecordsAsset.url }),
      mk("Cheiro De Culpado (Ao Vivo)", "Júnior e Cézar", 148, "musical", 210, { audioUrl: juniorCezarCheiroAsset.url }),
      mk("OLHO MARROM (Ao Vivo)", "Luan Santana", 185, "musical", 246, { audioUrl: luanSantanaOlhoAsset.url }),

      mk("Baqueado (Ao Vivo)", "Panda", 192, "musical", 188, { audioUrl: pandaBaqueadoAsset.url }),
      mk("Negro Drama", "Racionais MC's", 412, "musical", 246, { audioUrl: racionaisNegroDramaAsset.url }),
      mk("Erro Gostoso (Ao Vivo)", "Simone Mendes", 195, "musical", 196, { audioUrl: simoneErroGostosoAsset.url }),
      mk("Barulho Do Foguete (Ao Vivo)", "Zé Neto & Cristiano", 175, "musical", 172, { audioUrl: zeNetoBarulhoAsset.url }),
      mk("Cadeira Cativa (Ao Vivo)", "Zé Neto & Cristiano", 182, "musical", 246, { audioUrl: zeNetoCadeiraAsset.url }),
    ],
  },
  {
    id: "f5",
    name: "Vinhetas",
    color: "#f39c12",
    category: "vinheta",
    code: "VH",
    tracks: [
      mk("VH Carimbo 1", "Solutions", 6, "vinheta", 392),
      mk("VH Carimbo 2", "Solutions", 5, "vinheta", 440),
      mk("VH Hora Certa", "Solutions", 9, "vinheta", 330),
    ],
  },
  {
    id: "f6",
    name: "Comerciais",
    color: "#16a085",
    category: "comercial",
    code: "COM",
    tracks: [
      mk("Spot Loja Central", "Comercial", 30, "comercial", 147),
      mk("Promo Verão", "Comercial", 25, "comercial", 165),
    ],
  },
  {
    id: "f7",
    name: "Trilhas",
    color: "#34495e",
    category: "musical",
    code: "TRI",
    tracks: [
      mk("Trilha Notícias", "BED", 120, "musical", 110),
      mk("Trilha Esportes", "BED", 120, "musical", 130),
    ],
  },
  {
    id: "f8",
    name: "Textos",
    color: "#7f8c8d",
    category: "texto",
    code: "TXT",
    tracks: [
      mk("Testemunhal Patrocinador", "Texto ao vivo", 40, "texto", 0),
      mk("Nota Jornalística", "Texto ao vivo", 35, "texto", 0),
    ],
  },
];

export function fmt(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function cloneTrack(t: Track): Track {
  return { ...t, id: uid() };
}

// Special insertions (manual p.15): Pausa paralisa a programação; Hora Certa
// exibe a hora gravada. Não dão opção de escolha de conteúdo.
export function makePause(): Track {
  return mk("Pausa", "Programação paralisada", 0, "texto", 0, { kind: "pausa", origin: "manual" });
}

export function makeHoraCerta(): Track {
  return mk("Hora Certa", "Hora gravada", 9, "vinheta", 330, {
    kind: "horacerta",
    origin: "manual",
  });
}

// Texto do dia (manual p.36): inserção que é lida automaticamente (TTS) quando
// chega a sua vez na programação. A duração é estimada pelo tamanho do texto.
export function makeTextoDoDia(title: string, body: string): Track {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  const dur = Math.max(8, Math.round(words / 2.6)); // ~2.6 palavras/seg
  return mk(title || "Texto do dia", "Texto do dia", dur, "texto", 0, {
    kind: "textodia",
    origin: "manual",
    body,
  });
}

// Locução gravada (manual p.111-112): inserção com áudio real embutido.
export function makeLocucao(title: string, audioUrl: string, duration: number): Track {
  return mk(title || "Locução", "Locução gravada", Math.max(1, Math.round(duration)), "texto", 0, {
    kind: "locucao",
    origin: "manual",
    audioUrl,
  });
}

// Áudio de uma pasta de trabalho (atalho do Windows): guarda o caminho do
// arquivo, que é resolvido sob demanda quando o áudio vai tocar (manual p.145-149).
export function makeFolderAudioTrack(name: string, filePath: string, category: Category): Track {
  return mk(name || "Áudio", "", 0, category, 0, { filePath });
}

// ---- Recursos Avançados (Grade / Mapa / Playlist.ini) ----

// Build a fresh track for generator output (codes that aren't real folders).
export function makeTrack(
  title: string,
  artist: string,
  duration: number,
  category: Category,
  freq: number,
): Track {
  return mk(title, artist, duration, category, freq);
}

export function folderByCode(code: string): Folder | undefined {
  return folders.find((f) => f.code.toUpperCase() === code.trim().toUpperCase());
}

// Default Grade (musical) and Mapa (commercial) examples — faithful to manual p.85-86.
export const DEFAULT_GRADE = `06:00 VH, NAC, VHC, HC, INTER, VH, FB
06:15 VH, INTER, VHC, HC, FB, VH, INTER
06:30 VH, FB, VHC, HC, NAC, VH, INTER
06:45 VH, NAC, VHC, HC, INTER, VH, FB
07:00 VH, INTER, VHC, HC, FB, VH, INTER`;

export const DEFAULT_MAPA = `06:00 VH, 55, 23, VH, 62, 12, VH, 42, VHC, HC
06:15 VH, 45, HC, 18, 03, VHC, HC
06:30 VH, 23, 62, 12, 42, 55, VHC, HC
06:45 VH, 62, 12, 42, 55, 23, VHC, HC
07:00 VH, 12, 42, 55, 23, 62, VHC, HC`;
