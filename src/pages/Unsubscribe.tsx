import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State = "validating" | "valid" | "already" | "invalid" | "submitting" | "done" | "error";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>("validating");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`, {
      headers: { apikey: SUPABASE_KEY },
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setState("invalid");
          return;
        }
        if (json.valid === true) setState("valid");
        else if (json.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      })
      .catch(() => setState("invalid"));
  }, [token]);

  const confirmUnsubscribe = async () => {
    if (!token) return;
    setState("submitting");
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && (json.success || json.reason === "already_unsubscribed")) {
        setState("done");
      } else {
        setErrorMsg(json.error || "Não foi possível processar o pedido.");
        setState("error");
      }
    } catch (e) {
      setErrorMsg((e as Error).message);
      setState("error");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Cancelar subscrição de emails</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {state === "validating" && (
            <div className="flex flex-col items-center gap-2 py-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">A validar...</p>
            </div>
          )}

          {state === "valid" && (
            <>
              <p>Confirmas que queres deixar de receber emails da VRCF?</p>
              <Button onClick={confirmUnsubscribe} className="w-full">
                Confirmar cancelamento
              </Button>
            </>
          )}

          {state === "submitting" && (
            <div className="flex flex-col items-center gap-2 py-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">A processar...</p>
            </div>
          )}

          {state === "done" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p>Subscrição cancelada com sucesso.</p>
              <Button asChild variant="outline"><Link to="/">Voltar ao início</Link></Button>
            </div>
          )}

          {state === "already" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p>Já tinhas cancelado a subscrição anteriormente.</p>
              <Button asChild variant="outline"><Link to="/">Voltar ao início</Link></Button>
            </div>
          )}

          {state === "invalid" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <XCircle className="h-12 w-12 text-destructive" />
              <p>Link inválido ou expirado.</p>
              <Button asChild variant="outline"><Link to="/">Voltar ao início</Link></Button>
            </div>
          )}

          {state === "error" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <XCircle className="h-12 w-12 text-destructive" />
              <p>{errorMsg || "Ocorreu um erro."}</p>
              <Button onClick={confirmUnsubscribe} variant="outline">Tentar novamente</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
