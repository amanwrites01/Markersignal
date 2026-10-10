"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getBrowserClient } from "@/lib/supabase/browser";
import { markConversationRead, sendMessage } from "@/server/messages";
import { formatDateTime, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ThreadMessage } from "@/lib/data/messages";

export function Thread({
  conversationId,
  viewerId,
  messages,
  otherLastRead,
  otherName,
  isGroup = false,
  memberCount,
}: {
  conversationId: string;
  viewerId: string;
  messages: ThreadMessage[];
  otherLastRead: string | null;
  otherName: string;
  isGroup?: boolean;
  memberCount?: number;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const lastId = messages.at(-1)?.id;

  // Mark read whenever the thread shows new messages.
  useEffect(() => {
    void markConversationRead(conversationId);
    endRef.current?.scrollIntoView({ block: "end" });
  }, [conversationId, lastId]);

  // Realtime when available; polling keeps things correct if it isn't.
  useEffect(() => {
    const supabase = getBrowserClient();
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, () => router.refresh())
      .subscribe();
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 15_000);
    return () => {
      window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [conversationId, router]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return setError("Write a message");
    if (text.length > 5000) return setError("Keep messages under 5,000 characters");
    setError(null);
    start(async () => {
      const r = await sendMessage({ conversationId, body: text });
      if (r.ok) {
        setBody("");
        router.refresh();
      } else {
        setError(r.error);
        toast.error(r.error);
      }
    });
  }

  const lastOwn = [...messages].reverse().find((m) => m.senderId === viewerId);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ol className="flex-1 space-y-3.5 overflow-y-auto p-4 sm:p-6" aria-label={`Messages with ${otherName}`} aria-live="polite">
        {messages.length === 0 ? (
          <li className="py-10 text-center text-sm text-ink-muted">
            {isGroup ? "No group messages yet. Start the conversation with your creators!" : "No messages yet. Say hello."}
          </li>
        ) : null}
        {messages.map((m) => {
          const mine = m.senderId === viewerId;
          return (
            <li key={m.id} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
              {/* Show sender identity in group conversations */}
              {isGroup && !mine ? (
                <div className="mb-1 flex items-center gap-1.5 px-1 text-xs font-medium text-forest dark:text-ivory">
                  <Avatar className="size-4 shrink-0">
                    <AvatarFallback className="bg-forest text-[8px] text-lime">
                      {initials(m.senderName)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{m.senderName}</span>
                </div>
              ) : null}

              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5 shadow-2xs",
                  mine
                    ? "rounded-br-md bg-forest text-ivory dark:bg-forest dark:text-ivory"
                    : "rounded-bl-md border border-line bg-white dark:bg-card text-foreground",
                )}
              >
                <p className="sr-only">{mine ? "You" : m.senderName || otherName}:</p>
                <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                <p className={cn("mt-1 text-[11px]", mine ? "text-ivory/60" : "text-ink-muted")}>
                  <time dateTime={m.createdAt}>{formatDateTime(m.createdAt)}</time>
                  {mine && lastOwn?.id === m.id && otherLastRead && Date.parse(otherLastRead) >= Date.parse(m.createdAt) ? (
                    <span className="ml-2 inline-flex items-center gap-0.5">
                      <CheckCheck className="size-3" aria-hidden /> Read
                    </span>
                  ) : null}
                </p>
              </div>
            </li>
          );
        })}
        <div ref={endRef} />
      </ol>
      <form onSubmit={submit} className="border-t border-line bg-white dark:bg-card p-3 sm:p-4" noValidate>
        <label htmlFor="message-body" className="sr-only">
          {isGroup ? `Message everyone in ${otherName}` : `Message ${otherName}`}
        </label>
        <div className="flex items-end gap-2">
          <Textarea
            id="message-body"
            rows={2}
            maxLength={5000}
            placeholder={isGroup ? `Message everyone in ${otherName}…` : `Message ${otherName}…`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(e);
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "message-error" : "message-hint"}
            className="min-h-12 resize-none"
          />
          <Button type="submit" disabled={pending} aria-label="Send message">
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
            <span className="hidden sm:inline">Send</span>
          </Button>
        </div>
        {error ? (
          <p id="message-error" role="alert" className="mt-1 text-xs text-danger">
            {error}
          </p>
        ) : (
          <p id="message-hint" className="mt-1 text-xs text-ink-muted">
            {isGroup ? (
              <span>
                Ctrl/⌘ + Enter to send. Messages sent here are delivered to <strong>everyone</strong> in this group ({memberCount ?? "all"} members).
              </span>
            ) : (
              "Ctrl/⌘ + Enter to send. Keep agreements in the project — messages are visible to both parties."
            )}
          </p>
        )}
      </form>
    </div>
  );
}
