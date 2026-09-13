import { lstat, readdir, realpath, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cleanableRelativePaths = [
  ".next",
  ".next-dev",
  ".turbo",
  "dist",
  "node_modules/.cache",
  "node_modules/.vite",
  "tests/results",
];
const cleanableFilePaths = ["apps/web/next-env.d.ts"];
const workspaceContainers = ["apps", "packages"];

function isWithinRoot(root, targetPath) {
  const relativePath = path.relative(root, targetPath);

  return (
    relativePath !== "" &&
    !relativePath.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relativePath)
  );
}

async function workspaceRoots(root) {
  const roots = [];

  for (const containerName of workspaceContainers) {
    const containerPath = path.join(root, containerName);
    let entries;

    try {
      entries = await readdir(containerPath, { withFileTypes: true });
    } catch (error) {
      if (error?.code === "ENOENT") {
        continue;
      }

      throw error;
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        roots.push(path.join(containerPath, entry.name));
      }
    }
  }

  return roots;
}

async function validateTarget(target) {
  if (!isWithinRoot(repositoryRoot, target.path)) {
    throw new Error(`Refusing clean target outside ${repositoryRoot}: ${target.path}`);
  }

  let stats;

  try {
    stats = await lstat(target.path);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return undefined;
    }

    throw error;
  }

  if (stats.isSymbolicLink()) {
    throw new Error(`Refusing symlinked clean target: ${target.path}`);
  }

  if (target.kind === "directory" ? !stats.isDirectory() : !stats.isFile()) {
    throw new Error(`Clean target is not a ${target.kind}: ${target.path}`);
  }

  if ((await realpath(target.path)) !== target.path) {
    throw new Error(`Refusing symlinked clean target: ${target.path}`);
  }

  return target;
}

async function cleanRepository() {
  if ((await realpath(repositoryRoot)) !== repositoryRoot) {
    throw new Error(`Refusing symlinked repository root: ${repositoryRoot}`);
  }

  const roots = [repositoryRoot, ...(await workspaceRoots(repositoryRoot))];
  const targetsByPath = new Map();

  for (const root of roots) {
    for (const relativePath of cleanableRelativePaths) {
      const targetPath = path.join(root, relativePath);
      targetsByPath.set(targetPath, { kind: "directory", path: targetPath });
    }
  }

  for (const relativePath of cleanableFilePaths) {
    const targetPath = path.join(repositoryRoot, relativePath);
    targetsByPath.set(targetPath, { kind: "file", path: targetPath });
  }

  const validatedTargets = await Promise.all([...targetsByPath.values()].map(validateTarget));
  const existingTargets = validatedTargets.filter((target) => target !== undefined);

  for (const target of existingTargets) {
    await rm(target.path, { recursive: target.kind === "directory" });
  }

  return existingTargets.map((target) => target.path);
}

async function main() {
  if (process.argv.length !== 2) {
    throw new Error("Usage: pnpm clean");
  }

  const removedPaths = await cleanRepository();

  if (removedPaths.length === 0) {
    console.log("Repository caches and build outputs are already clean.");

    return;
  }

  console.log(`Removed ${removedPaths.length} cache and build output paths:`);

  for (const removedPath of removedPaths) {
    console.log(`  ${removedPath}`);
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : undefined;

if (invokedPath === import.meta.url) {
  await main();
}
