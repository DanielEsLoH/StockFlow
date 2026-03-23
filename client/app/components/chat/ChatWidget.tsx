import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Bot, User, Loader2, Sparkles } from "lucide-react";
import { cn } from "~/lib/utils";

const N8N_WEBHOOK_URL =
  import.meta.env.VITE_N8N_URL ||
  "https://n8n.stockflow.com.co/webhook/stockflow-chat";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatWidgetProps {
  open: boolean;
  onClose: () => void;
}

export function ChatWidget({ open, onClose }: ChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hola, soy el asistente virtual de StockFlow. Puedo ayudarte con preguntas sobre inventario, facturacion, planes, precios y mas. ¿En que puedo ayudarte?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = await res.json();

      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        content:
          data.reply ||
          "Lo siento, no pude procesar tu mensaje. Intenta de nuevo.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content:
            "Hubo un error al conectar con el asistente. Por favor intenta de nuevo o contacta a soporte: contacto@stockflow.com.co",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage],
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-[2px] sm:bg-transparent sm:backdrop-blur-none"
            onClick={onClose}
          />

          {/* Chat panel */}
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "fixed z-[61] flex flex-col overflow-hidden",
              "bg-white dark:bg-neutral-900",
              "border border-neutral-200/80 dark:border-neutral-700/60",
              "shadow-2xl shadow-neutral-900/10 dark:shadow-black/30",
              // Mobile: fullscreen
              "inset-0 sm:inset-auto",
              // Desktop: positioned below header, right side
              "sm:right-4 sm:top-16 sm:h-[min(600px,calc(100vh-5rem))] sm:w-[380px] sm:rounded-2xl",
            )}
          >
            {/* Header */}
            <div
              className={cn(
                "flex items-center justify-between px-4 py-3",
                "border-b border-neutral-200/80 dark:border-neutral-700/60",
                "bg-gradient-to-r from-primary-500 to-accent-600",
              )}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Asistente StockFlow
                  </h3>
                  <p className="text-[11px] text-white/70">
                    Responde al instante
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg
                           text-white/80 transition-colors hover:bg-white/15 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-2.5",
                      msg.role === "user" ? "flex-row-reverse" : "flex-row",
                    )}
                  >
                    {/* Avatar */}
                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                        msg.role === "assistant"
                          ? "bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400"
                          : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
                      )}
                    >
                      {msg.role === "assistant" ? (
                        <Bot className="h-3.5 w-3.5" />
                      ) : (
                        <User className="h-3.5 w-3.5" />
                      )}
                    </div>

                    {/* Bubble */}
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                        msg.role === "assistant"
                          ? "rounded-tl-md bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200"
                          : "rounded-tr-md bg-primary-500 text-white dark:bg-primary-600",
                      )}
                    >
                      {msg.content.split("\n").map((line, i) => (
                        <span key={i}>
                          {line}
                          {i < msg.content.split("\n").length - 1 && <br />}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {isLoading && (
                  <div className="flex gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400">
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md bg-neutral-100 px-4 py-3 dark:bg-neutral-800">
                      <span
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input */}
            <div
              className={cn(
                "border-t border-neutral-200/80 px-3 py-3",
                "dark:border-neutral-700/60",
              )}
            >
              <div
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-1.5",
                  "bg-neutral-100 dark:bg-neutral-800",
                  "focus-within:ring-2 focus-within:ring-primary-500/40",
                  "transition-shadow duration-150",
                )}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe tu pregunta..."
                  disabled={isLoading}
                  className={cn(
                    "flex-1 bg-transparent py-1.5 text-sm text-neutral-900 outline-none",
                    "placeholder:text-neutral-400",
                    "dark:text-neutral-100 dark:placeholder:text-neutral-500",
                    "disabled:opacity-50",
                  )}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    "transition-all duration-150",
                    input.trim() && !isLoading
                      ? "bg-primary-500 text-white hover:bg-primary-600 active:scale-95"
                      : "text-neutral-300 dark:text-neutral-600",
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              <p className="mt-2 text-center text-[10px] text-neutral-400 dark:text-neutral-500">
                Asistente IA de StockFlow — Puede cometer errores
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
