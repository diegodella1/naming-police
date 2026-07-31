#!/usr/bin/env node

import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

export async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? walk(path) : [path];
    }),
  );
  return files.flat();
}

function one(files, predicate, description) {
  const matches = files.filter(predicate);
  if (matches.length !== 1) {
    throw new Error(`Expected one ${description}; found ${matches.length}`);
  }
  return matches[0];
}

async function sha256(path) {
  const hash = createHash("sha256");
  hash.update(await readFile(path));
  return hash.digest("hex");
}

function publicUrl(baseUrl, releaseTag, path) {
  return `${baseUrl}/releases/${releaseTag}/${encodeURIComponent(basename(path))}`;
}

async function platformEntry(path, signaturePath, baseUrl, releaseTag) {
  return {
    url: publicUrl(baseUrl, releaseTag, path),
    signature: (await readFile(signaturePath, "utf8")).trim(),
  };
}

export async function prepareRelease({
  assetsDirectory,
  outputDirectory,
  version,
  baseUrl,
  publishedAt = new Date().toISOString(),
}) {
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
    throw new Error(`Invalid semantic version: ${version}`);
  }

  const files = await walk(assetsDirectory);
  const macUpdater = one(
    files,
    (path) => path.endsWith(".app.tar.gz"),
    "macOS updater archive",
  );
  const macSignature = one(
    files,
    (path) => path === `${macUpdater}.sig`,
    "macOS updater signature",
  );
  const macInstaller = one(files, (path) => path.endsWith(".dmg"), "macOS DMG");

  const windowsInstaller = one(
    files,
    (path) => /(?:_x64-setup|setup)\.exe$/i.test(path),
    "Windows NSIS installer",
  );
  const windowsSignature = one(
    files,
    (path) => path === `${windowsInstaller}.sig`,
    "Windows updater signature",
  );

  const releaseTag = `v${version}`;
  const versionedDirectory = join(outputDirectory, "versioned");
  await mkdir(versionedDirectory, { recursive: true });

  const publishFiles = [
    macUpdater,
    macSignature,
    macInstaller,
    windowsInstaller,
    windowsSignature,
  ];
  const names = publishFiles.map((path) => basename(path));
  if (new Set(names).size !== names.length) {
    throw new Error("Release asset basenames must be unique");
  }
  await Promise.all(
    publishFiles.map((path) => cp(path, join(versionedDirectory, basename(path)))),
  );

  const latest = {
    version,
    notes: `Naming Police ${releaseTag} beta`,
    pub_date: publishedAt,
    platforms: {
      "darwin-aarch64": await platformEntry(
        macUpdater,
        macSignature,
        baseUrl,
        releaseTag,
      ),
      "windows-x86_64": await platformEntry(
        windowsInstaller,
        windowsSignature,
        baseUrl,
        releaseTag,
      ),
    },
  };

  const [macStats, windowsStats] = await Promise.all([
    stat(macInstaller),
    stat(windowsInstaller),
  ]);
  const release = {
    schema_version: 1,
    version,
    published_at: publishedAt,
    platforms: {
      macos: {
        label: "macOS",
        arch: "Apple Silicon",
        min_os: "12.0",
        url: publicUrl(baseUrl, releaseTag, macInstaller),
        sha256: await sha256(macInstaller),
        size_bytes: macStats.size,
      },
      windows: {
        label: "Windows",
        arch: "x64",
        min_os: "10",
        url: publicUrl(baseUrl, releaseTag, windowsInstaller),
        sha256: await sha256(windowsInstaller),
        size_bytes: windowsStats.size,
      },
    },
  };

  await Promise.all([
    writeFile(join(outputDirectory, "latest.json"), `${JSON.stringify(latest, null, 2)}\n`),
    writeFile(join(outputDirectory, "release.json"), `${JSON.stringify(release, null, 2)}\n`),
  ]);

  return { latest, release, publishFiles: names };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const [assetsDirectory, outputDirectory, tag, baseUrl] = process.argv.slice(2);
  if (!assetsDirectory || !outputDirectory || !tag || !baseUrl) {
    console.error(
      "Usage: prepare-r2-release.mjs <assets-dir> <output-dir> <vX.Y.Z> <base-url>",
    );
    process.exit(2);
  }
  const version = tag.startsWith("v") ? tag.slice(1) : tag;
  await prepareRelease({ assetsDirectory, outputDirectory, version, baseUrl });
}
