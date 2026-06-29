// AES67 TX real (RTP multicast + SAP) e teste de loopback — Node/Electron.
// Registrado pelo main.cjs. Usa dgram (UDP) disponível no processo principal.
const dgram = require("dgram");
const os = require("os");

const SAP_GROUP = "239.255.255.255";
const SAP_PORT = 9875;
const MTU = 1500;

let activeTx = null; // { cfg, rtp, sap, sapTimer, flowTimer, sdp, sourceIp }

// ---- utils ---------------------------------------------------------------

function bytesPerSample(bits) { return bits === "L24" ? 3 : 2; }

function samplesPerPacket(cfg) {
  return Math.max(1, Math.round((cfg.sampleRate * cfg.ptime) / 1000));
}

function localIPv4Interfaces() {
  const out = [];
  const nis = os.networkInterfaces();
  for (const name of Object.keys(nis)) {
    for (const ni of nis[name] || []) {
      if (ni.family === "IPv4" && !ni.internal) out.push({ name, address: ni.address });
    }
  }
  return out;
}

function primarySourceIp() {
  const ifs = localIPv4Interfaces();
  return ifs.length ? ifs[0].address : "0.0.0.0";
}

function ipParts(ip) {
  const p = String(ip).split(".").map((x) => Number(x));
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return p;
}

function buildSdp(cfg, sourceIp) {
  const pt = 96;
  const id = Math.floor(Date.now() / 1000);
  return [
    "v=0",
    `o=- ${id} ${id} IN IP4 ${sourceIp}`,
    `s=${cfg.name}`,
    "t=0 0",
    `c=IN IP4 ${cfg.group}/${cfg.ttl}`,
    `m=audio ${cfg.port} RTP/AVP ${pt}`,
    `a=rtpmap:${pt} ${cfg.bits}/${cfg.sampleRate}/${cfg.channels}`,
    `a=ptime:${cfg.ptime}`,
    "a=ts-refclk:ptp=IEEE1588-2008:00-00-00-00-00-00-00-00:0",
    "a=mediaclk:direct=0",
    "a=recvonly",
  ].join("\r\n") + "\r\n";
}

// SAP/SDP (RFC 2974). withdraw=true envia o anúncio de remoção.
function buildSap(sdp, sourceIp, withdraw) {
  const ip = ipParts(sourceIp) || [0, 0, 0, 0];
  const header = Buffer.alloc(8);
  // V=1 (001) << 5 = 0x20; bit T (withdraw) = 0x04
  header[0] = 0x20 | (withdraw ? 0x04 : 0x00);
  header[1] = 0; // auth length
  header.writeUInt16BE(Math.floor(Math.random() * 0xffff), 2); // msg id hash
  header[4] = ip[0]; header[5] = ip[1]; header[6] = ip[2]; header[7] = ip[3];
  const ptype = Buffer.from("application/sdp\0", "ascii");
  return Buffer.concat([header, ptype, Buffer.from(sdp, "ascii")]);
}

// ---- codecs (big-endian, conforme AES67) ---------------------------------

function encodePayload(ref, off, count, channels, bits) {
  const bps = bytesPerSample(bits);
  const buf = Buffer.alloc(count * channels * bps);
  let p = 0;
  for (let i = 0; i < count; i++) {
    let v = ref[off + i];
    if (v > 1) v = 1; else if (v < -1) v = -1;
    if (bits === "L24") {
      let s = Math.round(v * 8388607);
      if (s < 0) s += 0x1000000;
      for (let c = 0; c < channels; c++) {
        buf[p++] = (s >> 16) & 0xff; buf[p++] = (s >> 8) & 0xff; buf[p++] = s & 0xff;
      }
    } else {
      const s = Math.round(v * 32767);
      for (let c = 0; c < channels; c++) { buf.writeInt16BE(s, p); p += 2; }
    }
  }
  return buf;
}

// Decode independente (lê big-endian explicitamente) — valida endianness.
function decodePayloadCh0(buf, channels, bits) {
  const bps = bytesPerSample(bits);
  const frame = channels * bps;
  const count = Math.floor(buf.length / frame);
  const out = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const base = i * frame;
    if (bits === "L24") {
      let s = (buf[base] << 16) | (buf[base + 1] << 8) | buf[base + 2];
      if (s & 0x800000) s -= 0x1000000;
      out[i] = s / 8388607;
    } else {
      out[i] = buf.readInt16BE(base) / 32767;
    }
  }
  return out;
}

function buildRtp(seq, ts, ssrc, pt, payload) {
  const h = Buffer.alloc(12);
  h[0] = 0x80; h[1] = pt & 0x7f;
  h.writeUInt16BE(seq & 0xffff, 2);
  h.writeUInt32BE(ts >>> 0, 4);
  h.writeUInt32BE(ssrc >>> 0, 8);
  return Buffer.concat([h, payload]);
}

// ---- handlers ------------------------------------------------------------

function validate(cfg) {
  const issues = [];
  const parts = ipParts(cfg.group);
  if (!parts) issues.push({ level: "error", msg: "Endereço multicast IPv4 inválido." });
  else if (parts[0] < 224 || parts[0] > 239)
    issues.push({ level: "error", msg: `Fora da faixa multicast 224–239 (1º octeto = ${parts[0]}).` });

  if (!Number.isInteger(cfg.port) || cfg.port < 1024 || cfg.port > 65535)
    issues.push({ level: "error", msg: "Porta RTP deve estar entre 1024 e 65535." });
  else if (cfg.port % 2 !== 0)
    issues.push({ level: "warning", msg: "Porta ímpar — convenção RTP usa porta par (RTCP = porta+1)." });

  if (cfg.sampleRate !== 48000)
    issues.push({ level: "warning", msg: "AES67 exige 48 kHz para interoperabilidade plena." });

  const spp = samplesPerPacket(cfg);
  const payload = spp * cfg.channels * bytesPerSample(cfg.bits);
  const ipPacket = 20 + 8 + 12 + payload;
  if (ipPacket > MTU)
    issues.push({ level: "error", msg: `Pacote ${ipPacket}B excede a MTU ${MTU}B — reduza ptime ou canais.` });

  if (activeTx && activeTx.cfg.group === cfg.group && activeTx.cfg.port === cfg.port)
    issues.push({ level: "error", msg: `Conflito: já existe TX ativa em ${cfg.group}:${cfg.port}.` });

  return {
    ok: !issues.some((i) => i.level === "error"),
    issues,
    interfaces: localIPv4Interfaces(),
  };
}

function openTx(cfg) {
  return new Promise((resolve) => {
    const v = validate(cfg);
    if (!v.ok) { resolve({ ok: false, error: v.issues.filter((i) => i.level === "error").map((i) => i.msg).join(" ") }); return; }
    if (activeTx) closeTx();

    const sourceIp = primarySourceIp();
    const sdp = buildSdp(cfg, sourceIp);
    const rtp = dgram.createSocket({ type: "udp4", reuseAddr: true });
    const sap = dgram.createSocket({ type: "udp4", reuseAddr: true });

    rtp.bind(() => {
      try {
        rtp.setMulticastTTL(cfg.ttl || 32);
        rtp.setMulticastLoopback(true);
      } catch { /* ignore */ }

      sap.bind(() => {
        try { sap.setMulticastTTL(cfg.ttl || 32); } catch { /* ignore */ }

        const spp = samplesPerPacket(cfg);
        const ssrc = Math.floor(Math.random() * 0xffffffff);
        let seq = Math.floor(Math.random() * 0x10000);
        let ts = 0;
        // fluxo RTP contínuo de silêncio (mantém o stream "vivo" na rede).
        const silence = Buffer.alloc(spp * cfg.channels * bytesPerSample(cfg.bits));
        const flowTimer = setInterval(() => {
          const pkt = buildRtp(seq++, ts, ssrc, 96, silence);
          ts = (ts + spp) >>> 0;
          rtp.send(pkt, cfg.port, cfg.group, () => {});
        }, Math.max(1, cfg.ptime));

        const sapPkt = buildSap(sdp, sourceIp, false);
        const announce = () => sap.send(sapPkt, SAP_PORT, SAP_GROUP, () => {});
        announce();
        const sapTimer = setInterval(announce, 30000); // re-anúncio periódico

        activeTx = { cfg, rtp, sap, sapTimer, flowTimer, sdp, sourceIp };
        resolve({ ok: true, sdp, sourceIp });
      });
    });

    rtp.on("error", () => resolve({ ok: false, error: "Falha ao abrir socket RTP." }));
  });
}

function closeTx() {
  if (!activeTx) return { ok: true };
  const { rtp, sap, sapTimer, flowTimer, cfg, sdp, sourceIp } = activeTx;
  try { clearInterval(sapTimer); } catch { /* ignore */ }
  try { clearInterval(flowTimer); } catch { /* ignore */ }
  try { sap.send(buildSap(sdp, sourceIp, true), SAP_PORT, SAP_GROUP, () => { try { sap.close(); } catch { /* */ } }); }
  catch { try { sap.close(); } catch { /* */ } }
  try { rtp.close(); } catch { /* ignore */ }
  activeTx = null;
  return { ok: true };
}

// Loopback local: sintetiza 1 kHz, empacota L16/L24 BE em RTP, transmite com
// multicast loopback, recebe no mesmo group:port e mede integridade + SNR.
function loopback(cfg) {
  return new Promise((resolve) => {
    const channels = cfg.channels;
    const bits = cfg.bits;
    const Fs = cfg.sampleRate;
    const spp = samplesPerPacket(cfg);
    const numPackets = Math.max(10, Math.min(2000, cfg.packets || 120));
    const total = spp * numPackets;
    const expectedPayload = spp * channels * bytesPerSample(bits);

    // sinal de referência: seno 1 kHz, meia escala.
    const ref = new Float32Array(total);
    for (let i = 0; i < total; i++) ref[i] = 0.5 * Math.sin((2 * Math.PI * 1000 * i) / Fs);

    const rx = dgram.createSocket({ type: "udp4", reuseAddr: true });
    const received = new Map(); // seq -> { len, dec }
    let baseSeq = null;
    let done = false;

    const finish = () => {
      if (done) return; done = true;
      try { rx.dropMembership(cfg.group); } catch { /* */ }
      try { rx.close(); } catch { /* */ }

      const dec = new Float32Array(total);
      let filled = 0, gaps = 0;
      let firstLen = 0;
      if (baseSeq !== null) {
        for (let i = 0; i < numPackets; i++) {
          const r = received.get((baseSeq + i) & 0xffff);
          if (r) {
            if (!firstLen) firstLen = r.len;
            dec.set(r.dec.subarray(0, spp), i * spp);
            filled++;
          } else gaps++;
        }
      }
      const span = Math.max(spp, filled * spp);
      let sig = 0, noise = 0;
      for (let i = 0; i < span; i++) { sig += ref[i] * ref[i]; const e = ref[i] - dec[i]; noise += e * e; }
      const snr = noise === 0 ? 144 : 10 * Math.log10(sig / Math.max(noise, 1e-20));
      const threshold = bits === "L24" ? 80 : 60;
      const payloadOk = firstLen === expectedPayload;
      resolve({
        packetsSent: numPackets,
        packetsReceived: received.size,
        expectedPayloadBytes: expectedPayload,
        actualPayloadBytes: firstLen,
        payloadOk,
        seqGaps: gaps,
        seqContinuous: gaps === 0 && received.size > 0,
        snrDb: Math.round(snr * 10) / 10,
        snrThreshold: threshold,
        pass: payloadOk && gaps === 0 && received.size === numPackets && snr >= threshold,
        bits, channels, sampleRate: Fs, ptime: cfg.ptime, samplesPerPacket: spp,
      });
    };

    rx.on("error", () => finish());
    rx.on("message", (msg) => {
      if (msg.length < 12) return;
      const seq = msg.readUInt16BE(2);
      if (baseSeq === null) baseSeq = seq;
      const payload = msg.subarray(12);
      received.set(seq, { len: payload.length, dec: decodePayloadCh0(payload, channels, bits) });
      if (received.size >= numPackets) setTimeout(finish, 30);
    });

    rx.bind(cfg.port, () => {
      try { rx.addMembership(cfg.group); rx.setMulticastLoopback(true); } catch { /* */ }
      const tx = dgram.createSocket("udp4");
      tx.bind(() => {
        try { tx.setMulticastTTL(cfg.ttl || 1); tx.setMulticastLoopback(true); } catch { /* */ }
        const ssrc = Math.floor(Math.random() * 0xffffffff);
        const startSeq = Math.floor(Math.random() * 0x10000);
        let ts = 0;
        let i = 0;
        const sendNext = () => {
          if (i >= numPackets) { try { tx.close(); } catch { /* */ } return; }
          const payload = encodePayload(ref, i * spp, spp, channels, bits);
          const pkt = buildRtp((startSeq + i) & 0xffff, ts, ssrc, 96, payload);
          ts = (ts + spp) >>> 0;
          tx.send(pkt, cfg.port, cfg.group, () => {});
          i++;
          setTimeout(sendNext, 1); // ritmo rápido p/ teste
        };
        setTimeout(sendNext, 60); // deixa o RX pronto
      });
    });

    setTimeout(finish, 6000); // timeout de segurança
  });
}

function register(ipcMain) {
  ipcMain.handle("aes67:tx:validate", (_e, cfg) => validate(cfg));
  ipcMain.handle("aes67:tx:open", (_e, cfg) => openTx(cfg));
  ipcMain.handle("aes67:tx:close", () => closeTx());
  ipcMain.handle("aes67:loopback:run", (_e, cfg) => loopback(cfg));
}

module.exports = { register, closeTx };
