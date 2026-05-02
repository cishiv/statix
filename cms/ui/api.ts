export type DocSummary = {
  path: string;
  slug: string;
  title: string;
  order: number | null;
  hidden: boolean;
};

export type LinkEntry = {
  title: string;
  slug: string;
};

async function expectOk(r: Response, action: string): Promise<Response> {
  if (!r.ok) {
    let msg = `${action} failed: ${r.status}`;
    try {
      const data = await r.json();
      if (typeof data?.error === "string") msg = data.error;
    } catch {
      /* leave default */
    }
    throw new Error(msg);
  }
  return r;
}

export async function fetchTree(): Promise<DocSummary[]> {
  const r = await expectOk(await fetch("/api/tree"), "load tree");
  const data = await r.json();
  return data.docs as DocSummary[];
}

export async function fetchLinks(): Promise<LinkEntry[]> {
  const r = await expectOk(await fetch("/api/links"), "load links");
  const data = await r.json();
  return data.links as LinkEntry[];
}

export async function fetchDoc(path: string): Promise<string> {
  const r = await expectOk(
    await fetch(`/api/doc?path=${encodeURIComponent(path)}`),
    "load doc"
  );
  return r.text();
}

export async function saveDoc(path: string, body: string): Promise<void> {
  await expectOk(
    await fetch(`/api/doc?path=${encodeURIComponent(path)}`, {
      method: "PUT",
      body,
    }),
    "save"
  );
}

export async function deleteDoc(path: string): Promise<void> {
  await expectOk(
    await fetch(`/api/doc?path=${encodeURIComponent(path)}`, {
      method: "DELETE",
    }),
    "delete"
  );
}

export async function moveDoc(from: string, to: string): Promise<void> {
  await expectOk(
    await fetch("/api/doc/move", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ from, to }),
    }),
    "rename"
  );
}

export async function fetchPreview(
  body: string,
  path: string
): Promise<string> {
  const r = await expectOk(
    await fetch("/api/preview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body, path }),
    }),
    "preview"
  );
  const data = await r.json();
  return data.html as string;
}

export type GitStatusEntry = {
  path: string;
  index: string;
  worktree: string;
};

export async function fetchGitStatus(): Promise<GitStatusEntry[]> {
  const r = await expectOk(await fetch("/api/git/status"), "git status");
  const data = await r.json();
  return data.entries as GitStatusEntry[];
}

export async function stageDocs(paths: string[]): Promise<void> {
  await expectOk(
    await fetch("/api/git/stage", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ paths }),
    }),
    "stage"
  );
}

export async function uploadImage(
  file: File,
  docPath: string
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("docPath", docPath);
  const r = await expectOk(
    await fetch("/api/image", { method: "POST", body: formData }),
    "image upload"
  );
  const data = await r.json();
  return data.markdown as string;
}

export async function commitDocs(message: string): Promise<{ sha?: string }> {
  const r = await expectOk(
    await fetch("/api/git/commit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message }),
    }),
    "commit"
  );
  const data = await r.json();
  return { sha: data.sha as string | undefined };
}
