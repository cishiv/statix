import { useEffect, useState } from "preact/hooks";
import {
  commitDocs,
  fetchGitStatus,
  pushChanges,
  stageDocs,
  type GitStatusEntry,
} from "../api.ts";

type CommitBarProps = {
  reloadKey: number;
  onCommitted: () => void;
};

export function CommitBar(props: CommitBarProps) {
  const [entries, setEntries] = useState<GitStatusEntry[]>([]);
  const [message, setMessage] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const reload = async (): Promise<void> => {
    try {
      const next = await fetchGitStatus();
      setEntries(next);
    } catch (e) {
      setError(toMessage(e));
    }
  };

  useEffect(() => {
    reload();
  }, [props.reloadKey]);

  const stagedCount = entries.filter(isStaged).length;
  const dirtyCount = entries.length;
  const unstagedPaths = entries
    .filter((e) => !isStaged(e) || e.worktree !== " ")
    .map((e) => e.path);

  const handleStage = async (): Promise<void> => {
    if (unstagedPaths.length === 0) return;
    setBusy(true);
    try {
      await stageDocs(unstagedPaths);
      await reload();
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const handleCommit = async (): Promise<void> => {
    if (!message.trim() || stagedCount === 0) return;
    setBusy(true);
    try {
      await commitDocs(message);
      setMessage("");
      await reload();
      props.onCommitted();
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const handlePush = async (): Promise<void> => {
    setBusy(true);
    try {
      await pushChanges();
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div class="commit-bar">
      <div class="commit-status">
        {dirtyCount === 0 ? (
          <span class="commit-clean">clean</span>
        ) : (
          <>
            <div class="commit-summary">
              <strong>{stagedCount}</strong> staged ·{" "}
              <strong>{dirtyCount - stagedCount}</strong> unstaged
            </div>
            <ul class="commit-list">
              {entries.map((e) => (
                <li
                  key={e.path}
                  class={isStaged(e) ? "commit-row staged" : "commit-row"}
                >
                  <span class="commit-mark">{e.index}{e.worktree}</span>
                  <span class="commit-path">{e.path}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <div class="commit-controls">
        <button onClick={handleStage} disabled={busy || unstagedPaths.length === 0}>
          stage all
        </button>
        <input
          class="commit-message"
          type="text"
          placeholder="commit message"
          value={message}
          onInput={(e) =>
            setMessage((e.currentTarget as HTMLInputElement).value)
          }
          disabled={busy}
        />
        <button
          class="commit-button"
          onClick={handleCommit}
          disabled={busy || !message.trim() || stagedCount === 0}
        >
          commit
        </button>
        <button onClick={handlePush} disabled={busy}>
          push
        </button>
      </div>
      {error && (
        <div class="error-toast" onClick={() => setError(null)}>
          {error}
        </div>
      )}
    </div>
  );
}

function isStaged(e: GitStatusEntry): boolean {
  return e.index !== " " && e.index !== "?";
}

function toMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
