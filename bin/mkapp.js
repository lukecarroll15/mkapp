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

p.log.step('Installing dependencies and configuring Tailwind CSS...');
await installTailwind(projectName, framework, variant);

p.outro(`Done! cd ${projectName} && npm run dev`);

// --- helpers ---

async function cleanupBoilerplate(projectName, framework, variant) {
  const root = join(process.cwd(), projectName);
  const isTs = variant.endsWith('-ts');

  await rm(join(root, 'src', 'assets'), { recursive: true, force: true });
  await rm(join(root, 'public', 'vite.svg'), { force: true });

  await writeFile(join(root, 'src', 'App.css'), '');

  const indexHtmlPath = join(root, 'index.html');
  let html = await readFile(indexHtmlPath, 'utf8');
  html = html.replace(/\s*<link rel="icon"[^>]*>\n?/g, '\n');
  html = html.replace(/<title>.*?<\/title>/, `<title>${projectName}</title>`);
  await writeFile(indexHtmlPath, html);

  const appFilename = getAppFilename(framework, isTs);
  const appContent = getAppTemplate(framework, isTs);
  await writeFile(join(root, 'src', appFilename), appContent);
}

async function installTailwind(projectName, framework, variant) {
  const root = join(process.cwd(), projectName);
  const isTs = variant.endsWith('-ts');

  // Install project deps + tailwind in one pass
  await runCommand(
    'npm',
    ['install', '-D', 'tailwindcss', '@tailwindcss/vite'],
    { cwd: root },
  );

  // Add tailwind plugin to vite config
  const configExt = isTs ? 'ts' : 'js';
  await writeFile(join(root, `vite.config.${configExt}`), getViteConfig(framework));

  // Replace index.css with tailwind import
  await writeFile(join(root, 'src', 'index.css'), '@import "tailwindcss";\n');
}

function getViteConfig(framework) {
  const plugins = {
    react:   [`import react from '@vitejs/plugin-react'`,   'react()'],
    vue:     [`import vue from '@vitejs/plugin-vue'`,        'vue()'],
    svelte:  [`import { svelte } from '@sveltejs/vite-plugin-svelte'`, 'svelte()'],
    preact:  [`import preact from '@preact/preset-vite'`,    'preact()'],
  };
  const [importLine, pluginCall] = plugins[framework];

  return `import { defineConfig } from 'vite'
${importLine}
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    ${pluginCall},
  ],
})
`;
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

function runCommand(command, args, { pipeInput, cwd } = {}) {
  return new Promise((resolve, reject) => {
    const stdio = pipeInput ? ['pipe', 'inherit', 'inherit'] : 'inherit';
    const child = spawn(command, args, { stdio, shell: true, ...(cwd && { cwd }) });
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
