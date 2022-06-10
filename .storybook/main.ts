import type { StorybookConfig } from '@storybook/core-common'

const config: StorybookConfig = {
    stories: [
        '../src/**/*.stories.mdx',
        '../src/**/*.stories.@(js|jsx|ts|tsx)',
    ],
    addons: ['@storybook/addon-links', '@storybook/addon-essentials'],
    framework: '@storybook/react',
    core: {
        builder: 'webpack5',
        disableTelemetry: true, // 👈 Disables telemetry
    },
}

module.exports = config
