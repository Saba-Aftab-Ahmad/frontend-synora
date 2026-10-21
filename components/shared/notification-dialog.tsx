"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, PauseCircle, PlayCircle, StopCircle, AlertTriangle, Rocket, Info, X } from "lucide-react"

export type NoticeKind = "started" | "paused" | "resumed" | "stopped" | "completed" | "error" | "info"
export type NoticeData = { kind: NoticeKind; title: string; message: string }

const STYLE: Record<NoticeKind, { color: string; Icon: React.ElementType }> = {
  started: { color: "#06b6d4", Icon: Rocket },
  paused: { color: "#f59e0b", Icon: PauseCircle },
  resumed: { color: "#10b981", Icon: PlayCircle },
  stopped: { color: "#f43f5e", Icon: StopCircle },
  completed: { color: "#10b981", Icon: CheckCircle2 },
  error: { color: "#ef4444", Icon: AlertTriangle },
  info: { color: "#a78bfa", Icon: Info },
}

// started / paused / resumed close by themselves; stopped / completed / error wait for the user.
const AUTO_CLOSE_MS: Partial<Record<NoticeKind, number>> = { started: 5000, paused: 4000, resumed: 3500, info: 5000 }

/**
 * Pop-up shown whenever training is started, paused, resumed, stopped,
 * completed (or fails).  Accessible (role="alertdialog"), closes with Esc,
 * and works on phones (bottom-sheet width, 16 px side gutter).
 */
export function NotificationDialog({ notice, onClose }: { notice: NoticeData | null; onClose: () => void }) {
  const router = useRouter()

  useEffect(() => {
    if (!notice) return
    const ms = AUTO_CLOSE_MS[notice.kind]
    const t = ms ? setTimeout(onClose, ms) : null
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => {
      if (t) clearTimeout(t)
      window.removeEventListener("keydown", onKey)
    }
  }, [notice, onClose])

  if (!notice) return null
  const { color, Icon } = STYLE[notice.kind]

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(3,5,7,0.65)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="notice-title"
        aria-describedby="notice-msg"
        data-testid={`notice-${notice.kind}`}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{ background: "#0c0f1a", border: `1px solid ${color}55`, boxShadow: `0 0 40px ${color}22` }}
      >
        <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 p-1 text-slate-500 hover:text-white">
          <X size={18} />
        </button>
        <div className="flex items-start gap-4">
          <div className="rounded-full p-2" style={{ background: `${color}22`, color }}>
            <Icon size={28} />
          </div>
          <div className="min-w-0">
            <h3 id="notice-title" className="text-lg font-semibold text-[#f0f4ff]">{notice.title}</h3>
            <p id="notice-msg" className="mt-1 text-sm leading-relaxed text-[#8892b0] break-words">{notice.message}</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {(notice.kind === "completed" || notice.kind === "stopped") && (
            <button
              onClick={() => { onClose(); router.push("/dashboard") }}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg,#7c3aed,#06b6d4)" }}
            >
              View Results →
            </button>
          )}
          <button onClick={onClose} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-[#cbd5e1] hover:bg-white/5">
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
