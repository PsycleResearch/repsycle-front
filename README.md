# Repsycle

Reusable front-end toolkit.

## Use a local development build

You may need to add some links using `yarn link` between `repsycle-front` and your app.

The following snippet let you enable a link between `repsycle-front` and your project, but also between `react` and your project since `repsycle-front` uses hooks.

```shell
cd repsycle-front
yarn install --frozen-lockfile
yarn build
yarn link
pushd node_modules/react
yarn link
popd
cd ../your-app
yarn link @psycle/repsycle
yarn link react
```
