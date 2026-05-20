#!/usr/bin/env node

import * as p from '@clack/prompts';
import { spawn } from 'child_process';

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

const { projectName, variant } = answers;

p.log.step(`Scaffolding ${projectName} with Vite...`);

await runCommand(
  'npm',
  ['create', 'vite@latest', projectName, '--', '--template', variant],
  { pipeInput: 'n\n' },
);

p.outro(`Done! Project created in ./${projectName}`);

// --- helpers ---

function getVariants(framework) {
  const variants = {
    react:   [{ value: 'react-ts', label: 'TypeScript' }, { value: 'react',   label: 'JavaScript' }],
    vue:     [{ value: 'vue-ts',   label: 'TypeScript' }, { value: 'vue',     label: 'JavaScript' }],
    svelte:  [{ value: 'svelte-ts',label: 'TypeScript' }, { value: 'svelte',  label: 'JavaScript' }],
    preact:  [{ value: 'preact-ts',label: 'TypeScript' }, { value: 'preact',  label: 'JavaScript' }],
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
