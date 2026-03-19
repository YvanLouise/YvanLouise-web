import { createApp } from "./app.js";
import { config, validateRuntimeConfig } from "./config.js";

validateRuntimeConfig();

const app = createApp();

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${config.port}`);
});
