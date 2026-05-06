import type { ReactNode } from "react";
import { useState } from "react";
import { TabNav } from "./TabNav";

interface ShellProps {
  children: ReactNode;
  onSync?: () => void;
  syncing?: boolean;
  tabs?: string[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  adminLocked?: boolean;
  isAdmin?: boolean;
  readOnly?: boolean;
  onUnlock?: (secret: string) => void;
  onLock?: () => void;
  playerName?: string;
}

export function Shell({
  children,
  onSync,
  syncing,
  tabs,
  activeTab,
  onTabChange,
  adminLocked = false,
  isAdmin = true,
  readOnly = false,
  onUnlock,
  onLock,
  playerName,
}: ShellProps) {
  const [showUnlock, setShowUnlock] = useState(false);
  const [secretInput, setSecretInput] = useState("");

  const handleUnlock = () => {
    if (onUnlock && secretInput.trim()) {
      onUnlock(secretInput.trim());
      setShowUnlock(false);
      setSecretInput("");
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      <header className="border-b border-border bg-bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="py-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-text-primary leading-tight">
                <span className="text-accent">DUPR</span> Dashboard
              </h1>
              {playerName && (
                <p className="text-xs text-text-muted">{playerName}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {readOnly && (
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-bg-card border border-border text-xs text-text-muted">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View Only
                </span>
              )}
              {adminLocked && !isAdmin && (
                <button
                  onClick={() => setShowUnlock(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-card border border-border text-text-secondary rounded-lg text-sm font-medium hover:bg-bg-card-hover hover:text-text-primary transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Admin
                </button>
              )}
              {adminLocked && isAdmin && onLock && (
                <button
                  onClick={onLock}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-card border border-border text-text-secondary rounded-lg text-sm font-medium hover:bg-bg-card-hover hover:text-text-primary transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                  Lock
                </button>
              )}
              {onSync && (
                <button
                  onClick={onSync}
                  disabled={syncing}
                  className="flex items-center gap-2 px-3 py-1.5 bg-accent text-bg-primary rounded-lg text-sm font-medium hover:bg-accent-dim transition-colors disabled:opacity-50"
                >
                  {syncing ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Syncing...
                    </>
                  ) : (
                    <>
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      Sync
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          {tabs && activeTab && onTabChange && (
            <TabNav tabs={tabs} active={activeTab} onChange={onTabChange} />
          )}
        </div>
      </header>

      {showUnlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-bg-card border border-border rounded-xl p-6 w-full max-w-sm mx-4 shadow-lg">
            <h3 className="text-lg font-semibold text-text-primary mb-2">Unlock Admin</h3>
            <p className="text-sm text-text-muted mb-4">
              Enter the admin secret to enable sync and configuration.
            </p>
            <input
              type="password"
              value={secretInput}
              onChange={(e) => setSecretInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
              placeholder="Admin secret"
              className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowUnlock(false);
                  setSecretInput("");
                }}
                className="px-4 py-2 text-sm text-text-muted hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUnlock}
                className="px-4 py-2 bg-accent text-bg-primary rounded-lg text-sm font-medium hover:bg-accent-dim transition-colors"
              >
                Unlock
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {children}
      </main>
    </div>
  );
}
