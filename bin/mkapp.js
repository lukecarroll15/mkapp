#!/usr/bin/env node

import * as p from '@clack/prompts';

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

p.outro(`Creating ${answers.projectName} with ${answers.framework} (${answers.variant})...`);

function getVariants(framework) {
  const variants = {
    react: [
      { value: 'react-ts', label: 'TypeScript' },
      { value: 'react', label: 'JavaScript' },
    ],
    vue: [
      { value: 'vue-ts', label: 'TypeScript' },
      { value: 'vue', label: 'JavaScript' },
    ],
    svelte: [
      { value: 'svelte-ts', label: 'TypeScript' },
      { value: 'svelte', label: 'JavaScript' },
    ],
    preact: [
      { value: 'preact-ts', label: 'TypeScript' },
      { value: 'preact', label: 'JavaScript' },
    ],
  };
  return variants[framework] ?? [];
}
