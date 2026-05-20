#!/usr/bin/env node

import * as p from '@clack/prompts';
import { spawn } from 'child_process';
import { rm, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

p.intro('mkapp — frontend project scaffolder');

const answers = await p.group(
  {
    projectName: () =>
      p.text({
        message: 'Project name:',
        placeholder: 'my-app',
        validate: (value) => {
          if (!value.trim()) return 'Project name is required.';
        },
      }),

    framework: () =>
      p.select({
        message: 'Select a framework:',
        options: [
          { value: 'react', label: 'React' },
          { value: 'vue', label: 'Vue' },
          { value: 'svelte', label: 'Svelte' },
          { value: 'preact', label: 'Preact' },
        ],
      }),

    variant: ({ results }) =>
      p.select({
        message: 'Select a variant:',
        options: getVariants(results.framework),
      }),
  },
  {
    onCancel: () => {
      p.cancel('Cancelled.');
      process.exit(0);
    },
  }
);

const { projectName, framework, variant } = answers;

p.log.step(`Scaffolding ${projectName} with Vite...`);

await runCommand(
  'npm',
  ['create', 'vite@latest', projectName, '--', '--template', variant],
  { pipeInput: 'n\n' },
);

p.log.step('Cleaning up boilerplate...');
await cleanupBoilerplate(projectName, framework, variant);

p.outro(`Done! Project created in ./${projectName}`);

// --- helpers ---

async function cleanupBoilerplate(projectName, framework, variant) {
  const root = join(process.cwd(), projectName);
  const isTs = variant.endsWith('-ts');

  // Delete default asset files
  await rm(join(root, 'src', 'assets'), { recursive: true, force: true });
  await rm(join(root, 'public', 'vite.svg'), { force: true });

  // Clear CSS files (index.css will get Tailwind directives in the next step)
  await writeFile(join(root, 'src', 'App.css'), '');
  await writeFile(join(root, 'src', 'index.css'), '');

  // Update index.html: remove favicon link, set title to project name
  const indexHtmlPath = join(root, 'index.html');
  let html = await readFile(indexHtmlPath, 'utf8');
  html = html.replace(/\s*<link rel="icon"[^>]*>\n?/g, '\n');
  html = html.replace(/<title>.*?<\/title>/, `<title>${projectName}</title>`);
  await writeFile(indexHtmlPath, html);

  // Rewrite the root app component
  const appFilename = getAppFilename(framework, isTs);
  const appContent = getAppTemplate(framework, isTs);
  await writeFile(join(root, 'src', appFilename), appContent);
}

function getAppFilename(framework, isTs) {
  if (framework === 'vue')    return 'App.vue';
  if (framework === 'svelte') return 'App.svelte';
  return isTs ? 'App.tsx' : 'App.jsx';
}

function getAppTemplate(framework, isTs) {
  if (framework === 'vue') {
    return `<template>
  <div>
    <h1>Hello World</h1>
  </div>
</template>

<script setup${isTs ? ' lang="ts"' : ''}>
</script>
`;
  }

  if (framework === 'svelte') {
    return `<h1>Hello World</h1>
`;
  }

  // React / Preact
  return `export default function App() {
  return (
    <div>
      <h1>Hello World</h1>
    </div>
  )
}
`;
}

function getVariants(framework) {
  const variants = {
    react:   [{ value: 'react-ts', label: 'TypeScript' }, { value: 'react',    label: 'JavaScript' }],
    vue:     [{ value: 'vue-ts',   label: 'TypeScript' }, { value: 'vue',      label: 'JavaScript' }],
    svelte:  [{ value: 'svelte-ts',label: 'TypeScript' }, { value: 'svelte',   label: 'JavaScript' }],
    preact:  [{ value: 'preact-ts',label: 'TypeScript' }, { value: 'preact',   label: 'JavaScript' }],
  };
  return variants[framework] ?? [];
}

function runCommand(command, args, { pipeInput } = {}) {
  return new Promise((resolve, reject) => {
    const stdio = pipeInput ? ['pipe', 'inherit', 'inherit'] : 'inherit';
    const child = spawn(command, args, { stdio, shell: true });
    if (pipeInput) {
      child.stdin.write(pipeInput);
      child.stdin.end();
    }
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command exited with code ${code}`));
    });
    child.on('error', reject);
  });
}
