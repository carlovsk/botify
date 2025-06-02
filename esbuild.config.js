const fs = require('fs');
const path = require('path');

module.exports = () => {
  /**
   * There's a problem when we enable minify and set sourcemap to inline in a local environment,
   * and then try to enable the debug in the IDE (VSCode in my case). So, because of that, we set
   * dynamic options for those flags based on the environment.
   */
  const isLocal = process.env.NODE_ENV === 'local' || process.env.NODE_ENV === 'test';

  const shouldMinify = isLocal ? false : true;
  const shouldInlineSourcemap = isLocal ? 'linked' : 'inline';
  const shouldKeepNames = true;

  return {
    bundle: true,
    minify: shouldMinify,
    sourcemap: shouldInlineSourcemap,
    keepNames: shouldKeepNames,
    plugins: [
      {
        name: 'alias',
        setup(build) {
          build.onResolve({ filter: /^@\// }, (args) => {
            return {
              path: path.resolve(args.resolveDir, 'src', args.path.slice(2)),
            };
          });
        },
      },
      {
        name: 'excludeVendorFromSourceMap',
        setup(build) {
          build.onLoad({ filter: /node_modules/ }, (args) => {
            if (args.path.includes('node_modules') && args.path.endsWith('.js')) {
              return {
                contents:
                  fs.readFileSync(args.path, 'utf8') +
                  '\n//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJtYXBwaW5ncyI6IkEifQ==',
                loader: 'default',
              };
            }
          });
        },
      },
    ],
  };
};
