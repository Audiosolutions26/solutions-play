import { useState } from "react";
import { Radio, User, Lock, LogIn } from "lucide-react";
import { toast } from "sonner";

export interface Operator {
  id: string;
  name: string;
  role: string;
  pin: string;
}

export const operators: Operator[] = [
  { id: "op1", name: "Operador Demo", role: "Locutor", pin: "0000" },
  { id: "op2", name: "Ana Souza", role: "Programadora", pin: "1234" },
  { id: "op3", name: "Carlos Lima", role: "Administrador", pin: "9999" },
];

export function OperatorLogin({ onLogin }: { onLogin: (op: Operator) => void }) {
  const [selected, setSelected] = useState<Operator>(operators[0]);
  const [pin, setPin] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin !== selected.pin) {
      toast.error("Senha incorreta. (dica: senha do demo é 0000)");
      return;
    }
    toast.success(`Bem-vindo, ${selected.name}`);
    onLogin(selected);
  };

  return (
    <div className="grid min-h-screen w-full place-items-center bg-gradient-to-br from-pl-toolbar-dark via-pl-toolbar to-pl-toolbar-light p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm overflow-hidden rounded-lg border border-white/20 bg-pl-panel shadow-2xl"
      >
        <div className="flex items-center gap-2 bg-pl-toolbar-dark px-4 py-3 text-white">
          <Radio className="h-5 w-5" />
          <div>
            <div className="text-sm font-bold leading-tight">Solutions-Play</div>
            <div className="text-[11px] opacity-80">Acesso do operador</div>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <label className="block text-[12px] font-semibold text-pl-text">
            <span className="mb-1 flex items-center gap-1"><User className="h-3.5 w-3.5" /> Operador</span>
            <select
              value={selected.id}
              onChange={(e) => setSelected(operators.find((o) => o.id === e.target.value)!)}
              className="h-9 w-full rounded border border-pl-panel-dark bg-white px-2 text-[13px] text-pl-text outline-none focus:border-pl-toolbar"
            >
              {operators.map((o) => (
                <option key={o.id} value={o.id}>{o.name} — {o.role}</option>
              ))}
            </select>
          </label>

          <label className="block text-[12px] font-semibold text-pl-text">
            <span className="mb-1 flex items-center gap-1"><Lock className="h-3.5 w-3.5" /> Senha</span>
            <input
              type="password"
              value={pin}
              autoFocus
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              className="h-9 w-full rounded border border-pl-panel-dark bg-white px-2 text-[13px] text-pl-text outline-none focus:border-pl-toolbar"
            />
          </label>

          <button
            type="submit"
            className="flex h-10 w-full items-center justify-center gap-2 rounded bg-gradient-to-b from-pl-transport to-pl-transport-dark font-semibold text-white shadow hover:brightness-110 active:translate-y-px"
          >
            <LogIn className="h-4 w-4" /> Entrar
          </button>
          <p className="text-center text-[11px] text-pl-text/60">Modo demonstração • senha do demo: 0000</p>
        </div>
      </form>
    </div>
  );
}