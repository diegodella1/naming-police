import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { prepareRelease } from "./prepare-r2-release.mjs";

test("builds updater and public release manifests", async () => {
  const root = await mkdtemp(join(tmpdir(), "naming-police-release-"));
  const assets = join(root, "assets");
  const output = join(root, "output");
  await mkdir(join(assets, "mac"), { recursive: true });
  await mkdir(join(assets, "windows"), { recursive: true });
  await mkdir(output, { recursive: true });

  const fixtures = {
    "mac/Naming.Police.app.tar.gz": "mac updater",
    "mac/Naming.Police.app.tar.gz.sig": "mac-signature",
    "mac/Naming.Police_0.1.0_aarch64.dmg": "mac installer",
    "windows/Naming.Police_0.1.0_x64-setup.exe": "windows installer",
    "windows/Naming.Police_0.1.0_x64-setup.exe.sig": "windows-signature",
  };
  await Promise.all(
    Object.entries(fixtures).map(([path, content]) =>
      writeFile(join(assets, path), content),
    ),
  );

  const result = await prepareRelease({
    assetsDirectory: assets,
    outputDirectory: output,
    version: "0.1.0",
    baseUrl: "https://downloads.example.com",
    publishedAt: "2026-07-30T12:00:00.000Z",
  });

  assert.equal(result.latest.platforms["darwin-aarch64"].signature, "mac-signature");
  assert.equal(
    result.latest.platforms["windows-x86_64"].url,
    "https://downloads.example.com/releases/v0.1.0/Naming.Police_0.1.0_x64-setup.exe",
  );
  assert.equal(result.release.platforms.macos.size_bytes, 13);
  assert.match(result.release.platforms.windows.sha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(
    JSON.parse(await readFile(join(output, "latest.json"), "utf8")),
    result.latest,
  );
});
