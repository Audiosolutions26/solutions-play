import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Network, Radio, Square, Play, ShieldCheck, ShieldAlert, AlertTriangle, Copy,
  Download, Upload, Activity, RefreshCw,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  type Aes67Config, type ValidationResult, type LoopbackResult,
  CHANNEL_OPTS, RATE_OPTS, BITS_OPTS, PTIME_OPTS, DEFAULT_AES67,
  loadAes67, saveAes67, packetMetrics, buildSdp, validateAes67, aes67Supported,
  openTxAes67, closeTxAes67, loopbackAes67, downloadAccessFile, parseAccessFile,
  type Aes67Input, loadAes67Rx, saveAes67Rx, validateRxInput,
  type ValidationIssue,
} from "@/lib/play-aes67";
import { platformLabel } from "@/lib/play-native";
import { logEvent } from "@/lib/play-events";

export function Aes67Panel() {
  const [cfg, setCfg] = useState<Aes67Config>(loadAes67);
  const [val, setVal] = useState<ValidationResult | null>(null);
  const [tx, setTx] = useState<{ active: boolean; sdp?: string; sourceIp?: string }>({ active: false });
  const [txError, setTxError] = useState<string | null>(null);
  const [loop, setLoop] = useState<LoopbackResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [rx, setRx] = useState<Aes67Input | null>(loadAes67Rx);
  const [rxPreview, setRxPreview] = useState<
    { input: Aes67Input; issues: ValidationIssue[]; fileName: string } | null
  >(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const supported = aes67Supported();

  const metrics = useMemo(() => packetMetrics(cfg), [cfg]);
  const set = <K extends keyof Aes67Config>(k: K, v: Aes67Config[K]) =>
    setCfg((c) => ({ ...c, [k]: v }));

  // Validação ao vivo sempre que a config muda.
  useEffect(() => {
    let alive = true;
    void validateAes67(cfg).then((r) => { if (alive) setVal(r); });
    return () => { alive = false; };
  }, [cfg]);

  // Auto-save dos presets (TX e entrada) por projeto — sem reconfigurar.
  useEffect(() => { saveAes67(cfg); }, [cfg]);
  useEffect(() => { saveAes67Rx(rx); }, [rx]);

  const previewSdp = useMemo(
    () => buildSdp(cfg, tx.sourceIp || val?.interfaces[0]?.address || "0.0.0.0"),
    [cfg, tx.sourceIp, val],
  );

  const persist = () => { saveAes67(cfg); toast.success("Configuração AES67 salva."); };

  const startTx = async () => {
    setBusy(true);
    saveAes67(cfg);
    const r = await openTxAes67(cfg);
    setBusy(false);
    if (r.ok) {
      setTxError(null);
      setTx({ active: true, sdp: r.sdp, sourceIp: r.sourceIp });
      logEvent("secao", "AES67 TX iniciada", `${cfg.group}:${cfg.port} • ${cfg.bits}/${cfg.sampleRate}/${cfg.channels} • origem ${r.sourceIp}`);
      toast.success("TX AES67 no ar (SAP anunciado).");
    } else {
      setTxError(r.error || "Falha ao iniciar a TX.");
      toast.error(r.error || "Não foi possível iniciar a TX.");
      if (r.sdp) setTx((t) => ({ ...t, sdp: r.sdp }));
    }
  };

  const stopTx = async () => {
    setBusy(true);
    await closeTxAes67();
    setBusy(false);
    setTxError(null);
    setTx({ active: false });
    logEvent("secao", "AES67 TX parada", "SAP withdraw enviado");
    toast.info("TX AES67 encerrada (SAP withdraw).");
  };

  const runLoopback = async () => {
    setBusy(true);
    setLoop(null);
    const r = await loopbackAes67(cfg, 120);
    setBusy(false);
    if (!r) { toast.error("Loopback disponível apenas no app desktop (Windows)."); return; }
    setLoop(r);
    logEvent("secao", `Loopback AES67 ${r.pass ? "OK" : "FALHOU"}`, `SNR ${r.snrDb} dB (mín ${r.snrThreshold}) • ${r.packetsReceived}/${r.packetsSent} pkts • payload ${r.actualPayloadBytes}/${r.expectedPayloadBytes}B`);
    toast[r.pass ? "success" : "error"](r.pass ? `Loopback OK — SNR ${r.snrDb} dB` : `Loopback falhou — SNR ${r.snrDb} dB`);
  };

  const copySdp = async () => {
    try { await navigator.clipboard.writeText(tx.sdp || previewSdp); toast.success("SDP copiado."); }
    catch { toast.error("Não foi possível copiar."); }
  };

  const onImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseAccessFile(String(reader.result || ""));
      const sourceIp = parsed.sourceIp;
      const { issues } = validateRxInput(parsed);
      delete parsed.sourceIp;
      const input: Aes67Input = { ...DEFAULT_AES67, ...parsed, sourceIp };
      // Mostra preview com campos detectados e avisos ANTES de aplicar.
      setRxPreview({ input, issues, fileName: f.name });
    };
    reader.readAsText(f);
    e.target.value = "";
  };

  const applyRxPreview = () => {
    if (!rxPreview) return;
    setRx(rxPreview.input);
    toast.success(`Entrada AES67 aplicada de "${rxPreview.fileName}".`);
    logEvent("secao", "AES67 RX aplicada", `${rxPreview.input.group}:${rxPreview.input.port} • ${rxPreview.input.bits}/${rxPreview.input.sampleRate}/${rxPreview.input.channels}`);
    setRxPreview(null);
  };

  const errors = val?.issues.filter((i) => i.level === "error") ?? [];
  const warns = val?.issues.filter((i) => i.level === "warning") ?? [];

  // Status em tempo real do TX e da entrada RX.
  const txStatus: StatusKind = busy ? "running" : txError ? "error" : tx.active ? "running" : "stopped";
  const txStatusLabel = busy ? "Processando…" : txError ? "Erro" : tx.active ? "No ar" : "Parado";
  const rxIssues = rx ? validateRxInput(rx).issues : [];
  const rxHasError = rxIssues.some((i) => i.level === "error");
  const rxStatus: StatusKind = !rx ? "stopped" : rxHasError ? "error" : "running";
  const rxStatusLabel = !rx ? "Sem entrada" : rxHasError ? "Erro" : "Ativa";

  return (
    <div className="space-y-4 py-1">
      {!supported && (
        <div className="flex items-center gap-2 rounded border border-amber-300 bg-amber-50 p-2 text-[12px] text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          TX/loopback reais rodam no app desktop ({platformLabel()} atual). Aqui você configura, valida e gera o arquivo de acesso.
        </div>
      )}

      {/* Status em tempo real */}
      <div className="grid grid-cols-2 gap-2">
        <StatusCard title="AES67 TX (saída)" kind={txStatus} label={txStatusLabel} detail={tx.active && tx.sourceIp ? `origem ${tx.sourceIp}` : txError || undefined} />
        <StatusCard title="AES67 RX (entrada)" kind={rxStatus} label={rxStatusLabel} detail={rx ? `${rx.group}:${rx.port}` : undefined} />
      </div>

      {/* Configuração */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label className="text-[11px]">Nome da sessão (s=)</Label>
          <Input value={cfg.name} onChange={(e) => set("name", e.target.value)} className="h-8" />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Multicast group (c=)</Label>
          <Input value={cfg.group} onChange={(e) => set("group", e.target.value)} placeholder="239.69.0.1" className="h-8 font-mono" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[11px]">Porta RTP</Label>
            <Input type="number" value={cfg.port} onChange={(e) => set("port", Number(e.target.value))} className="h-8 font-mono" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">TTL</Label>
            <Input type="number" value={cfg.ttl} onChange={(e) => set("ttl", Number(e.target.value))} className="h-8 font-mono" />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Canais</Label>
          <Select value={String(cfg.channels)} onValueChange={(v) => set("channels", Number(v))}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>{CHANNEL_OPTS.map((c) => <SelectItem key={c} value={String(c)}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Sample rate</Label>
          <Select value={String(cfg.sampleRate)} onValueChange={(v) => set("sampleRate", Number(v))}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>{RATE_OPTS.map((r) => <SelectItem key={r} value={String(r)}>{(r / 1000).toLocaleString("pt-BR")} kHz</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Bits</Label>
          <Select value={cfg.bits} onValueChange={(v) => set("bits", v as Aes67Config["bits"])}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>{BITS_OPTS.map((b) => <SelectItem key={b} value={b}>{b}{b === "L16" ? " (16-bit)" : " (24-bit)"}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">ptime (ms)</Label>
          <Select value={String(cfg.ptime)} onValueChange={(v) => set("ptime", Number(v))}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>{PTIME_OPTS.map((p) => <SelectItem key={p} value={String(p)}>{p} ms</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* Métricas em tempo real */}
      <div className="grid grid-cols-4 gap-2 rounded-lg border border-border bg-muted/40 p-2 text-center text-[11px]">
        <Metric label="Samples/pkt" value={String(metrics.samplesPerPacket)} />
        <Metric label="Payload" value={`${metrics.payloadBytes} B`} />
        <Metric label="Pacote IP" value={`${metrics.ipPacketBytes} B`} />
        <Metric label={`MTU ${metrics.mtu}`} value={metrics.withinMtu ? "OK" : "EXCEDE"} ok={metrics.withinMtu} />
      </div>

      {/* Validação ao vivo */}
      <div className="rounded-lg border border-border p-2">
        <div className="mb-1 flex items-center gap-2 text-[12px] font-semibold">
          {errors.length === 0
            ? <ShieldCheck className="h-4 w-4 text-emerald-600" />
            : <ShieldAlert className="h-4 w-4 text-red-600" />}
          Validação de rede ({val?.source === "bridge" ? "ao vivo" : "local"})
          <Button variant="ghost" size="sm" className="ml-auto h-7" onClick={() => void validateAes67(cfg).then(setVal)}>
            <RefreshCw className="mr-1 h-3.5 w-3.5" /> Revalidar
          </Button>
        </div>
        {errors.length === 0 && warns.length === 0 && (
          <p className="text-[11px] text-emerald-700">Configuração válida e conforme AES67.</p>
        )}
        {errors.map((i, n) => (
          <p key={`e${n}`} className="flex items-center gap-1 text-[11px] text-red-700"><ShieldAlert className="h-3.5 w-3.5" /> {i.msg}</p>
        ))}
        {warns.map((i, n) => (
          <p key={`w${n}`} className="flex items-center gap-1 text-[11px] text-amber-700"><AlertTriangle className="h-3.5 w-3.5" /> {i.msg}</p>
        ))}
        {!!val?.interfaces.length && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Interfaces IPv4: {val.interfaces.map((f) => `${f.address} (${f.name})`).join(" · ")}
          </p>
        )}
      </div>

      {/* TX real */}
      <div className="flex flex-wrap items-center gap-2">
        {!tx.active ? (
          <Button onClick={startTx} disabled={busy || !!errors.length} className="bg-emerald-600 hover:bg-emerald-700">
            <Radio className="mr-1 h-4 w-4" /> Iniciar TX
          </Button>
        ) : (
          <Button onClick={stopTx} disabled={busy} variant="destructive">
            <Square className="mr-1 h-4 w-4" /> Parar TX
          </Button>
        )}
        <Button variant="outline" onClick={runLoopback} disabled={busy}>
          <Activity className="mr-1 h-4 w-4" /> Teste de loopback
        </Button>
        {tx.active && tx.sourceIp && (
          <span className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white">
            NO AR • origem {tx.sourceIp}
          </span>
        )}
      </div>

      {/* SDP publicado */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Label className="text-[11px]">{tx.active ? "SDP publicado (SAP)" : "SDP que será publicado"}</Label>
          <Button variant="ghost" size="sm" className="ml-auto h-7" onClick={copySdp}><Copy className="mr-1 h-3.5 w-3.5" /> Copiar</Button>
        </div>
        <pre className="max-h-36 overflow-auto rounded border border-border bg-muted/40 p-2 text-[10px] leading-tight">{tx.sdp || previewSdp}</pre>
      </div>

      {/* Resultado do loopback */}
      {loop && (
        <div className={`rounded-lg border p-2 text-[11px] ${loop.pass ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50"}`}>
          <div className="mb-1 flex items-center gap-2 text-[12px] font-semibold">
            {loop.pass ? <ShieldCheck className="h-4 w-4 text-emerald-600" /> : <ShieldAlert className="h-4 w-4 text-red-600" />}
            Loopback {loop.pass ? "aprovado" : "reprovado"} — {loop.bits} {loop.sampleRate / 1000}kHz/{loop.channels}ch
          </div>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            <li>Pacotes: <b>{loop.packetsReceived}/{loop.packetsSent}</b></li>
            <li>Sequência RTP: <b>{loop.seqContinuous ? "contínua" : `${loop.seqGaps} falha(s)`}</b></li>
            <li>Payload: <b>{loop.actualPayloadBytes}/{loop.expectedPayloadBytes} B</b> {loop.payloadOk ? "✓" : "✗"}</li>
            <li>SNR: <b>{loop.snrDb} dB</b> (mín {loop.snrThreshold})</li>
          </ul>
          {loop.error && <p className="mt-1 text-red-700">Erro: {loop.error}</p>}
        </div>
      )}

      {/* Arquivo de acesso */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <Button variant="outline" size="sm" onClick={() => downloadAccessFile(cfg, tx.sourceIp || val?.interfaces[0]?.address || "0.0.0.0")}>
          <Download className="mr-1 h-4 w-4" /> Baixar .sdp (saída TX)
        </Button>
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <Upload className="mr-1 h-4 w-4" /> Importar .sdp (entrada RX)
        </Button>
        <input ref={fileRef} type="file" accept=".sdp,text/plain" className="hidden" onChange={onImport} />
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setCfg({ ...DEFAULT_AES67 })}>Padrões</Button>
        <Button size="sm" onClick={persist}>Salvar</Button>
      </div>

      {/* Entrada AES67 (RX) importada */}
      {rx && (
        <div className="rounded-lg border border-sky-300 bg-sky-50 p-2 text-[11px]">
          <div className="mb-1 flex items-center gap-2 text-[12px] font-semibold text-sky-800">
            <Upload className="h-4 w-4" /> Entrada AES67 (RX): {rx.name}
            <Button variant="ghost" size="sm" className="ml-auto h-6 text-sky-800" onClick={() => downloadAccessFile(rx, rx.sourceIp || "0.0.0.0")}>
              <Download className="mr-1 h-3.5 w-3.5" /> Baixar .sdp
            </Button>
            <Button variant="ghost" size="sm" className="h-6 text-sky-800" onClick={() => setRx(null)}>Remover</Button>
          </div>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-sky-900">
            <li>Group: <b className="font-mono">{rx.group}:{rx.port}</b></li>
            <li>Formato: <b>{rx.bits} {rx.sampleRate / 1000}kHz/{rx.channels}ch</b></li>
            <li>ptime: <b>{rx.ptime} ms</b> • TTL: <b>{rx.ttl}</b></li>
            {rx.sourceIp && <li>Origem: <b className="font-mono">{rx.sourceIp}</b></li>}
          </ul>
          {rxIssues.map((i, n) => (
            <p key={`rx${n}`} className={`mt-0.5 flex items-center gap-1 ${i.level === "error" ? "text-red-700" : "text-amber-700"}`}>
              {i.level === "error" ? <ShieldAlert className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />} {i.msg}
            </p>
          ))}
          <p className="mt-1 text-sky-700">Preset salvo automaticamente — recarrega ao reabrir o app.</p>
        </div>
      )}

      {/* Preview de importação RX — confirma campos detectados antes de aplicar */}
      {rxPreview && (
        <div className="rounded-lg border border-indigo-300 bg-indigo-50 p-2 text-[11px]">
          <div className="mb-1 flex items-center gap-2 text-[12px] font-semibold text-indigo-800">
            <Upload className="h-4 w-4" /> Confirmar entrada de "{rxPreview.fileName}"
          </div>
          <p className="mb-1 text-indigo-700">Campos detectados no SDP — revise antes de aplicar:</p>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-indigo-900">
            <li>Nome: <b>{rxPreview.input.name}</b></li>
            <li>Group: <b className="font-mono">{rxPreview.input.group}:{rxPreview.input.port}</b></li>
            <li>Formato: <b>{rxPreview.input.bits} {rxPreview.input.sampleRate / 1000}kHz/{rxPreview.input.channels}ch</b></li>
            <li>ptime: <b>{rxPreview.input.ptime} ms</b> • TTL: <b>{rxPreview.input.ttl}</b></li>
            {rxPreview.input.sourceIp && <li>Origem: <b className="font-mono">{rxPreview.input.sourceIp}</b></li>}
          </ul>
          {rxPreview.issues.length === 0 ? (
            <p className="mt-1 flex items-center gap-1 text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" /> Compatível com AES67.</p>
          ) : (
            rxPreview.issues.map((i, n) => (
              <p key={`pv${n}`} className={`mt-0.5 flex items-center gap-1 ${i.level === "error" ? "text-red-700" : "text-amber-700"}`}>
                {i.level === "error" ? <ShieldAlert className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />} {i.msg}
              </p>
            ))
          )}
          <div className="mt-2 flex items-center gap-2">
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={rxPreview.issues.some((i) => i.level === "error")}
              onClick={applyRxPreview}
            >
              Aplicar entrada
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setRxPreview(null)}>Cancelar</Button>
            {rxPreview.issues.some((i) => i.level === "error") && (
              <span className="text-[10px] text-red-700">Corrija os erros no SDP para poder aplicar.</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div>
      <div className={`text-sm font-bold ${ok === false ? "text-red-600" : ok === true ? "text-emerald-600" : "text-pl-toolbar"}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

type StatusKind = "stopped" | "running" | "error";

function StatusCard({ title, kind, label, detail }: { title: string; kind: StatusKind; label: string; detail?: string }) {
  const style =
    kind === "running"
      ? { border: "border-emerald-300", bg: "bg-emerald-50", dot: "bg-emerald-500", text: "text-emerald-700", pulse: true }
      : kind === "error"
        ? { border: "border-red-300", bg: "bg-red-50", dot: "bg-red-500", text: "text-red-700", pulse: false }
        : { border: "border-border", bg: "bg-muted/40", dot: "bg-muted-foreground/50", text: "text-muted-foreground", pulse: false };
  return (
    <div className={`rounded-lg border ${style.border} ${style.bg} p-2`}>
      <div className="text-[10px] font-medium text-muted-foreground">{title}</div>
      <div className={`mt-0.5 flex items-center gap-1.5 text-[12px] font-semibold ${style.text}`}>
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${style.dot}`}>
          {style.pulse && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${style.dot} opacity-75`} />}
        </span>
        {label}
      </div>
      {detail && <div className="mt-0.5 break-words text-[10px] text-muted-foreground">{detail}</div>}
    </div>
  );
}
