import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2, AlertTriangle, Mail, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

type EmailStats = {
  healthy: boolean;
  issues: string[];
  stats24h: { total: number; sent: number; failed: number; dlq: number; suppressed: number; pending: number };
  stats7d: { total: number; sent: number; failed: number; dlq: number; suppressed: number; pending: number };
  lastSentAt: string | null;
  recent: Array<{
    id: string;
    message_id: string;
    template_name: string;
    recipient_email: string;
    status: string;
    error_message: string | null;
    created_at: string;
  }>;
  checkedAt: string;
};

const statusColor = (s: string) => {
  if (s === "sent") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
  if (s === "failed" || s === "dlq") return "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30";
  if (s === "suppressed") return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
  return "bg-muted text-muted-foreground border-border";
};

export function EmailHealthPanel() {
  const [testing, setTesting] = useState(false);

  const { data, isLoading, refetch, isFetching } = useQuery<EmailStats>({
    queryKey: ["email-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("email-stats");
      if (error) throw error;
      return data as EmailStats;
    },
    refetchInterval: 60_000, // auto-refresh every minute
  });

  const runHealthCheck = async (force = false) => {
    setTesting(true);
    try {
      const { error } = await supabase.functions.invoke("email-health-check", {
        body: force ? { force: true } : {},
      });
      if (error) throw error;
      toast.success(force ? "Email de teste enviado para geral@vrcf.pt" : "Verificação executada");
      refetch();
    } catch (e: any) {
      toast.error(e?.message || "Erro a executar verificação");
    } finally {
      setTesting(false);
    }
  };

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">A carregar estado dos emails…</div>;
  }

  if (!data) {
    return (
      <div className="py-12 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Não foi possível carregar dados.</p>
        <Button onClick={() => refetch()} className="mt-4" variant="outline">Tentar novamente</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {data.healthy ? (
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          ) : (
            <AlertTriangle className="h-8 w-8 text-red-500" />
          )}
          <div>
            <h2 className="text-xl font-semibold">
              {data.healthy ? "Sistema de Emails — Saudável" : "Sistema de Emails — Atenção"}
            </h2>
            <p className="text-xs text-muted-foreground">
              Última verificação: {new Date(data.checkedAt).toLocaleString("pt-PT")}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={() => runHealthCheck(true)} disabled={testing}>
            <Mail className="mr-2 h-4 w-4" />
            Enviar email de teste
          </Button>
        </div>
      </div>

      {/* Issues banner */}
      {!data.healthy && (
        <Card className="border-red-500/40 bg-red-500/5">
          <CardContent className="pt-4">
            <p className="font-medium text-red-700 dark:text-red-400 mb-2">Problemas detetados:</p>
            <ul className="space-y-1 text-sm">
              {data.issues.map((iss, i) => (
                <li key={i} className="text-red-700 dark:text-red-400">• {iss}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-normal text-muted-foreground">Enviados 24h</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-emerald-600">{data.stats24h.sent}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-normal text-muted-foreground">Falhados 24h</CardTitle></CardHeader>
          <CardContent><p className={`text-3xl font-bold ${data.stats24h.failed > 0 ? "text-red-600" : ""}`}>{data.stats24h.failed}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-normal text-muted-foreground">DLQ (desistidos)</CardTitle></CardHeader>
          <CardContent><p className={`text-3xl font-bold ${data.stats24h.dlq > 0 ? "text-red-600" : ""}`}>{data.stats24h.dlq}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-normal text-muted-foreground">Pendentes</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{data.stats24h.pending}</p></CardContent>
        </Card>
      </div>

      {/* 7 days summary */}
      <Card>
        <CardHeader><CardTitle className="text-base">Últimos 7 dias</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div><span className="text-muted-foreground">Total:</span> <strong>{data.stats7d.total}</strong></div>
            <div><span className="text-muted-foreground">Enviados:</span> <strong className="text-emerald-600">{data.stats7d.sent}</strong></div>
            <div><span className="text-muted-foreground">Falhados:</span> <strong className="text-red-600">{data.stats7d.failed}</strong></div>
            <div><span className="text-muted-foreground">DLQ:</span> <strong className="text-red-600">{data.stats7d.dlq}</strong></div>
            <div><span className="text-muted-foreground">Suprimidos:</span> <strong className="text-amber-600">{data.stats7d.suppressed}</strong></div>
          </div>
          {data.lastSentAt && (
            <p className="mt-4 text-xs text-muted-foreground flex items-center gap-2">
              <Clock className="h-3 w-3" />
              Último envio com sucesso: {new Date(data.lastSentAt).toLocaleString("pt-PT")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent log */}
      <Card>
        <CardHeader><CardTitle className="text-base">Últimos envios (50 mais recentes)</CardTitle></CardHeader>
        <CardContent>
          {data.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Sem envios registados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3">Data</th>
                    <th className="py-2 pr-3">Template</th>
                    <th className="py-2 pr-3">Destinatário</th>
                    <th className="py-2 pr-3">Estado</th>
                    <th className="py-2">Erro</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleString("pt-PT")}
                      </td>
                      <td className="py-2 pr-3">{r.template_name}</td>
                      <td className="py-2 pr-3 text-xs">{r.recipient_email}</td>
                      <td className="py-2 pr-3">
                        <Badge variant="outline" className={statusColor(r.status)}>{r.status}</Badge>
                      </td>
                      <td className="py-2 text-xs text-red-600 max-w-xs truncate" title={r.error_message ?? ""}>
                        {r.error_message ?? ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Verificação automática 2x/dia (08:00 e 18:00). Se houver problemas, recebes alerta em geral@vrcf.pt.
      </p>
    </div>
  );
}