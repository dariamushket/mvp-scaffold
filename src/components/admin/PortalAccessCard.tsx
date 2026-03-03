"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Loader2, Copy, Check, RefreshCw, ExternalLink } from "lucide-react";

interface PortalAccessCardProps {
  leadId: string;
  inviteSharedAt: string | null;
  isActivated: boolean;
}

type State = "idle" | "loading" | "link_ready" | "error";

export function PortalAccessCard({ leadId, inviteSharedAt, isActivated }: PortalAccessCardProps) {
  const [state, setState] = useState<State>("idle");
  const [link, setLink] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [sharedAt, setSharedAt] = useState<string | null>(inviteSharedAt);

  const generateLink = async () => {
    setState("loading");
    setErrorMsg("");
    setCopied(false);

    try {
      const res = await fetch(`/api/leads/${leadId}/invite`, { method: "POST" });
      const body = await res.json();

      if (!res.ok) {
        setErrorMsg(body.error ?? "Unbekannter Fehler");
        setState("error");
        return;
      }

      setLink(body.link);
      setSharedAt(new Date().toISOString());
      setState("link_ready");
    } catch {
      setErrorMsg("Netzwerkfehler");
      setState("error");
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select input
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portal-Zugang</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isActivated ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Aktiviert
            </span>
          </div>
        ) : state === "link_ready" ? (
          <>
            <p className="text-sm text-muted-foreground">
              Einlade-Link generiert. Teilen Sie diesen Link mit dem Kunden:
            </p>
            <div className="flex gap-2">
              <input
                readOnly
                value={link}
                className="flex-1 rounded-md border bg-muted px-3 py-1.5 text-xs font-mono text-muted-foreground"
                onFocus={(e) => e.target.select()}
              />
              <Button size="sm" variant="outline" onClick={copyLink} className="shrink-0">
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            {copied && (
              <p className="text-xs text-green-600">Link kopiert!</p>
            )}
            <Button size="sm" variant="ghost" onClick={generateLink} className="w-full text-xs">
              <RefreshCw className="mr-1.5 h-3 w-3" />
              Neuen Link generieren
            </Button>
          </>
        ) : sharedAt && state === "idle" ? (
          <>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                <ExternalLink className="h-3.5 w-3.5" />
                Geteilt · {formatDate(sharedAt)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Ein Einlade-Link wurde generiert. Der Kunde hat noch keinen Account erstellt.
            </p>
            <Button size="sm" variant="outline" onClick={generateLink} className="w-full">
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Link neu generieren
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Generieren Sie einen Einlade-Link, um diesem Lead Zugang zum Portal zu geben.
            </p>
            <Button
              className="w-full bg-[#2d8a8a] text-white hover:bg-[#257373]"
              size="sm"
              onClick={generateLink}
              disabled={state === "loading"}
            >
              {state === "loading" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Einladen
            </Button>
          </>
        )}
        {state === "error" && (
          <p className="text-xs text-destructive">{errorMsg}</p>
        )}
      </CardContent>
    </Card>
  );
}
