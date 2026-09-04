const launcher = require('./local-launcher.cjs');

module.exports = launcher;
if (require.main === module) launcher.main().catch(error => {
  console.error(`[ERROR] ${error.message}`);
  process.exitCode = 1;
});
