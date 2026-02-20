"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { Send, Loader2, CheckCircle, XCircle } from "lucide-react";

interface InviteButtonProps {
  leadId: string;
}

type State = "idle" | "loading" | "success" | "error";

export function InviteButton({ leadId }: InviteButtonProps) {
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const handleInvite = async () => {
    setState("loading");
    setErrorMsg("");

    try {
      const res = await fetch(`/api/leads/${leadId}/invite`, { method: "POST" });
      const body = await res.json();

      if (!res.ok) {
        setErrorMsg(body.error ?? "Unknown error");
        setState("error");
        return;
      }

      setState("success");
    } catch {
      setErrorMsg("Network error");
      setState("error");
    }
  };

  if (state === "success") {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <CheckCircle className="h-4 w-4" />
        Invite sent
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Button
        className="w-full"
        size="sm"
        onClick={handleInvite}
        disabled={state === "loading"}
      >
        {state === "loading" ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Send className="mr-2 h-4 w-4" />
        )}
        Invite to Portal
      </Button>
      {state === "error" && (
        <div className="flex items-center gap-1 text-xs text-destructive">
          <XCircle className="h-3 w-3" />
          {errorMsg}
        </div>
      )}
    </div>
  );
}
