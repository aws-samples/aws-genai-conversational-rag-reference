/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { TextFile } from 'projen';
import { ReactTypeScriptProject } from 'projen/lib/web';

export const withStorybook = (project: ReactTypeScriptProject) => {
  // Add storybook dependencies
  const storybookDeps = [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-links',
    '@storybook/blocks',
    '@storybook/preset-create-react-app',
    '@storybook/react',
    '@storybook/react-webpack5',
    '@storybook/testing-library',
    'babel-plugin-named-exports-order',
    'eslint-plugin-storybook',
    'prop-types',
    'storybook',
    'webpack',
  ];
  project.addDevDeps(...storybookDeps);

  // Add storybook commands
  project.package.setScript('storybook', 'storybook dev -p 6006');

  // Generate storybook files
  new TextFile(project, '.storybook/main.ts', {
    lines: `
    import type { StorybookConfig } from "@storybook/react-webpack5";
    const config: StorybookConfig = {
      stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|ts|tsx)"],
      addons: [
        "@storybook/addon-links",
        "@storybook/addon-essentials",
        "@storybook/preset-create-react-app",
        "@storybook/addon-interactions",
      ],
      framework: {
        name: "@storybook/react-webpack5",
        options: {},
      },
      docs: {
        autodocs: "tag",
      },
      core:{
        disableTelemetry: true,
      },
      staticDirs: ["../public"],
    };
    export default config;    
  `.split('\n'),
  });

  new TextFile(project, '.storybook/preview.ts', {
    lines: `import type { Preview } from "@storybook/react";

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
};

export default preview;   
  `.split('\n'),
  });

  // Play nicely with eslint if available
  project.eslint?.allowDevDeps('**/*.stories.*');
  project.eslint?.allowDevDeps('**/.storybook/**/*.*');
  project.eslint?.addExtends('plugin:storybook/recommended');

  // Failsafe if rule is overwritten
  project.eslint?.addOverride({
    files: ['**/*.stories.*', '**/.storybook/**/*.*'],
    rules: {
      'import/no-extraneous-dependencies': 'off',
    },
  });
  project.eslint?.allowDevDeps('**/.storybook/**/*.*');
};
