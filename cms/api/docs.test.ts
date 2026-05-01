import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  listDocs,
  readDocFile,
  writeDocFile,
  deleteDocFile,
} from "./docs.ts";

describe("docs api helpers", () => {
  const tmpDir = path.join(process.cwd(), ".test-cms-docs-" + Date.now());

  beforeAll(() => {
    fs.mkdirSync(path.join(tmpDir, "guides"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, "index.md"),
      `---
title: Home
order: 0
---

# Welcome
`
    );
    fs.writeFileSync(
      path.join(tmpDir, "guides", "auth.md"),
      `---
title: Authentication
order: 2
---

# Auth
`
    );
    fs.writeFileSync(
      path.join(tmpDir, "guides", "no-order.md"),
      `---
title: Untitled Order
hidden: true
---

x
`
    );
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("listDocs", () => {
    it("returns one entry per markdown file", async () => {
      const docs = await listDocs(tmpDir);
      expect(docs).toHaveLength(3);
    });

    it("populates path, slug, title, order, hidden", async () => {
      const docs = await listDocs(tmpDir);
      const home = docs.find((d) => d.path === "index.md");
      expect(home).toEqual({
        path: "index.md",
        slug: "/",
        title: "Home",
        order: 0,
        hidden: false,
      });
    });

    it("uses forward-slash separators in path regardless of OS", async () => {
      const docs = await listDocs(tmpDir);
      const auth = docs.find((d) => d.slug === "/guides/auth");
      expect(auth?.path).toBe("guides/auth.md");
    });

    it("emits null for missing order", async () => {
      const docs = await listDocs(tmpDir);
      const noOrder = docs.find((d) => d.path === "guides/no-order.md");
      expect(noOrder?.order).toBeNull();
      expect(noOrder?.hidden).toBe(true);
    });
  });

  describe("readDocFile / writeDocFile / deleteDocFile", () => {
    it("round-trips file contents", async () => {
      const target = path.join(tmpDir, "scratch.md");
      const body = "---\ntitle: Scratch\n---\n\nhello\n";
      await writeDocFile(target, body);
      const read = await readDocFile(target);
      expect(read).toBe(body);
      await deleteDocFile(target);
      expect(fs.existsSync(target)).toBe(false);
    });

    it("creates parent directories on write", async () => {
      const target = path.join(tmpDir, "deep", "nested", "new.md");
      await writeDocFile(target, "x");
      expect(fs.existsSync(target)).toBe(true);
      await deleteDocFile(target);
    });
  });
});
