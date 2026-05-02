import { spawn } from "node:child_process";

export type GitStatusEntry = {
  path: string;
  index: string;
  worktree: string;
};

export type GitResult =
  | { ok: true; sha?: string }
  | { ok: false; error: string };

export async function gitStatus(
  cwd: string,
  scope: string
): Promise<GitStatusEntry[]> {
  const out = await runGit(["status", "--porcelain=v1", "-z", "--", scope], cwd);
  return parsePorcelain(out);
}

export async function gitStage(
  cwd: string,
  paths: string[]
): Promise<GitResult> {
  if (paths.length === 0) return { ok: false, error: "no paths provided" };
  try {
    await runGit(["add", "--", ...paths], cwd);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function gitCommit(
  cwd: string,
  message: string
): Promise<GitResult> {
  try {
    await runGit(["commit", "-m", message], cwd);
    const sha = (await runGit(["rev-parse", "HEAD"], cwd)).trim();
    return { ok: true, sha };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function gitPush(cwd: string): Promise<GitResult> {
  try {
    await runGit(["push"], cwd);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export function parsePorcelain(stdout: string): GitStatusEntry[] {
  const entries: GitStatusEntry[] = [];
  const records = stdout.split("\0");
  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    if (rec.length < 3) continue;
    const index = rec[0];
    const worktree = rec[1];
    const filePath = rec.slice(3);
    if (index === "R" || index === "C") {
      i++;
    }
    entries.push({ path: filePath, index, worktree });
  }
  return entries;
}

function runGit(args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("git", args, { cwd });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d: Buffer) => {
      stdout += d.toString();
    });
    proc.stderr.on("data", (d: Buffer) => {
      stderr += d.toString();
    });
    proc.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr.trim() || `git ${args[0]} exited ${code}`));
    });
    proc.on("error", reject);
  });
}
