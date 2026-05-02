import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { saveImage } from "./image.ts";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("saveImage", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = path.join(
      process.cwd(),
      ".test-image-" + Math.random().toString(36).slice(2)
    );
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("writes the image alongside the doc", async () => {
    fs.mkdirSync(path.join(tmpDir, "guides"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, "guides", "intro.md"),
      "---\ntitle: Intro\n---\n"
    );
    const result = await saveImage(
      tmpDir,
      "guides/intro.md",
      "diagram.png",
      PNG.buffer
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.markdown).toBe("![diagram](diagram.png)");
    expect(result.savedPath).toBe("guides/diagram.png");
    expect(
      fs.existsSync(path.join(tmpDir, "guides", "diagram.png"))
    ).toBe(true);
  });

  it("creates the doc's parent directory if missing", async () => {
    const result = await saveImage(
      tmpDir,
      "new/path/note.md",
      "x.png",
      PNG.buffer
    );
    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, "new", "path", "x.png"))).toBe(
      true
    );
  });

  it("rejects unsupported extensions", async () => {
    const result = await saveImage(
      tmpDir,
      "intro.md",
      "evil.exe",
      PNG.buffer
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(400);
    expect(result.error).toContain("unsupported");
  });

  it("rejects path traversal in docPath", async () => {
    const result = await saveImage(
      tmpDir,
      "../escape.md",
      "x.png",
      PNG.buffer
    );
    expect(result.ok).toBe(false);
  });

  it("strips directories from filename", async () => {
    const result = await saveImage(
      tmpDir,
      "intro.md",
      "../../etc/passwd.png",
      PNG.buffer
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.savedPath).toBe("passwd.png");
  });

  it("appends a numeric suffix on collision", async () => {
    fs.writeFileSync(path.join(tmpDir, "intro.md"), "x");
    fs.writeFileSync(path.join(tmpDir, "img.png"), "first");
    const result = await saveImage(
      tmpDir,
      "intro.md",
      "img.png",
      PNG.buffer
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.savedPath).toBe("img-1.png");
    expect(fs.existsSync(path.join(tmpDir, "img-1.png"))).toBe(true);
    expect(fs.readFileSync(path.join(tmpDir, "img.png"), "utf-8")).toBe(
      "first"
    );
  });

  it("rejects docPath that doesn't end in .md", async () => {
    const result = await saveImage(tmpDir, "evil.exe", "x.png", PNG.buffer);
    expect(result.ok).toBe(false);
  });

  it("rejects hidden filenames", async () => {
    const result = await saveImage(
      tmpDir,
      "intro.md",
      ".bashrc",
      PNG.buffer
    );
    expect(result.ok).toBe(false);
  });
});
