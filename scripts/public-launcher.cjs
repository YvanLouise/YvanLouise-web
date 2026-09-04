const { main } = require('./local-launcher.cjs');

if (require.main === module) main(process.argv.slice(2), 'public').catch(error => {
  console.error(`[ERROR] ${error.message}`);
  process.exitCode = 1;
});
