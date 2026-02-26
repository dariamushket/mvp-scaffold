"use client";

import { useState, useEffect } from "react";
import { Send } from "lucide-react";
import { TaskComment } from "@/types";

interface CommentThreadProps {
  taskId: string;
  currentUserId: string;
  currentUserRole: "admin" | "customer";
}

export function CommentThread({ taskId, currentUserId, currentUserRole }: CommentThreadProps) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`/api/tasks/${taskId}/comments`)
      .then((r) => r.json())
      .then((data) => setComments(Array.isArray(data) ? data : []))
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, [taskId]);

  async function handleSend() {
    if (!body.trim()) return;
    setSending(true);

    const optimistic: TaskComment = {
      id: `temp-${Date.now()}`,
      task_id: taskId,
      author_id: currentUserId,
      body: body.trim(),
      created_at: new Date().toISOString(),
    };
    setComments((prev) => [...prev, optimistic]);
    setBody("");

    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: optimistic.body }),
      });
      if (res.ok) {
        const saved: TaskComment = await res.json();
        setComments((prev) => prev.map((c) => (c.id === optimistic.id ? saved : c)));
      }
    } catch {
      // revert optimistic
      setComments((prev) => prev.filter((c) => c.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  }

  function getInitials(authorId: string) {
    return authorId === currentUserId
      ? currentUserRole === "admin" ? "A" : "K"
      : currentUserRole === "admin" ? "K" : "A";
  }

  function getAvatarColor(authorId: string) {
    if (authorId === currentUserId) {
      return currentUserRole === "admin" ? "bg-[#2d8a8a]" : "bg-purple-500";
    }
    return currentUserRole === "admin" ? "bg-purple-500" : "bg-[#2d8a8a]";
  }

  return (
    <div className="space-y-4">
      {loading ? (
        <p className="text-sm text-gray-400">Lade Kommentare…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-400">Noch keine Kommentare</p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="flex items-start gap-3">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${getAvatarColor(comment.author_id)}`}
              >
                {getInitials(comment.author_id)}
              </div>
              <div className="flex-1">
                <div className="rounded-lg bg-gray-50 px-3 py-2">
                  <p className="text-sm text-gray-700">{comment.body}</p>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  {new Date(comment.created_at).toLocaleString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex items-end gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
          }}
          placeholder="Kommentar schreiben…"
          rows={2}
          className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#2d8a8a] focus:ring-1 focus:ring-[#2d8a8a] resize-none"
        />
        <button
          onClick={handleSend}
          disabled={!body.trim() || sending}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2d8a8a] text-white disabled:opacity-50 hover:bg-[#267878]"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
