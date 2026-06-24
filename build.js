const esbuild = require('esbuild');
const watch = process.argv.includes('--watch');

const entries = {
  'login':             'www/js/entries/login.js',
  'register':          'www/js/entries/register.js',
  'admin-home':        'www/js/entries/admin-home.js',
  'admin-entrada':     'www/js/entries/admin-entrada.js',
  'admin-clientes':    'www/js/entries/admin-clientes.js',
  'admin-mensalistas': 'www/js/entries/admin-mensalistas.js',
  'admin-sessoes':     'www/js/entries/admin-sessoes.js',
  'admin-setores':     'www/js/entries/admin-setores.js',
  'admin-tarifas':     'www/js/entries/admin-tarifas.js',
  'client-home':       'www/js/entries/client-home.js',
  'client-vagas':      'www/js/entries/client-vagas.js',
  'client-veiculos':   'www/js/entries/client-veiculos.js',
  'client-historico':  'www/js/entries/client-historico.js',
};

async function build() {
  const ctx = await esbuild.context({
    entryPoints: entries,
    bundle: true,
    minify: !watch,
    outdir: 'www/js/dist',
    platform: 'browser',
    target: ['es2017'],
    format: 'iife',
    define: {
      'process.env.NODE_ENV': JSON.stringify(watch ? 'development' : 'production'),
    },
  });

  if (watch) {
    await ctx.watch();
    console.log('[esbuild] Watching for changes...');
  } else {
    await ctx.rebuild();
    await ctx.dispose();
    console.log('[esbuild] Build complete → www/js/dist/');
  }
}

build().catch(() => process.exit(1));
