#!/usr/bin/env node
/**
 * Bump version across all sources, generate changelog, commit, and tag.
 *
 * Usage:
 *   node scripts/bump-version.mjs <major|minor|patch|x.y.z>
 *
 * Examples:
 *   node scripts/bump-version.mjs patch   # 1.0.0 → 1.0.1
 *   node scripts/bump-version.mjs minor   # 1.0.0 → 1.1.0
 *   node scripts/bump-version.mjs major   # 1.0.0 → 2.0.0
 *   node scripts/bump-version.mjs 2.5.0   # set explicit version
 */

import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function writeJson(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}

function bumpSemver(current, type) {
  const [major, minor, patch] = current.split(".").map(Number);
  switch (type) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    default:
      if (/^\d+\.\d+\.\d+$/.test(type)) return type;
      console.error(`Invalid version: ${type}`);
      console.error("Usage: node scripts/bump-version.mjs <major|minor|patch|x.y.z>");
      process.exit(1);
  }
}

const arg = process.argv[2];
if (!arg) {
  console.error("Usage: node scripts/bump-version.mjs <major|minor|patch|x.y.z>");
  process.exit(1);
}

// 1. Read current version from root package.json
const rootPkg = readJson(resolve(root, "package.json"));
const oldVersion = rootPkg.version;
const newVersion = bumpSemver(oldVersion, arg);

console.log(`Bumping version: ${oldVersion} → ${newVersion}\n`);

// 2. Update root package.json
rootPkg.version = newVersion;
writeJson(resolve(root, "package.json"), rootPkg);
console.log("  ✓ package.json");

// 3. Update frontend/package.json
const frontendPkgPath = resolve(root, "frontend/package.json");
const frontendPkg = readJson(frontendPkgPath);
frontendPkg.version = newVersion;
writeJson(frontendPkgPath, frontendPkg);
console.log("  ✓ frontend/package.json");

// 4. Update backend/app/version.py
const versionPyPath = resolve(root, "backend/app/version.py");
writeFileSync(
  versionPyPath,
  `"""Single source of truth for backend version."""\n\n__version__ = "${newVersion}"\n`
);
console.log("  ✓ backend/app/version.py");

// 5. Generate changelog
console.log("\nGenerating CHANGELOG.md...");
execSync("npm run changelog", { cwd: root, stdio: "inherit" });

// 6. Stage, commit, and tag
console.log(`\nCommitting and tagging v${newVersion}...`);
execSync("git add package.json frontend/package.json backend/app/version.py CHANGELOG.md", {
  cwd: root,
});
execSync(`git commit -m "chore(release): v${newVersion}"`, { cwd: root, stdio: "inherit" });
execSync(`git tag v${newVersion}`, { cwd: root });

console.log(`\nDone! Released v${newVersion}`);
console.log("Run 'git push && git push --tags' to publish.");
