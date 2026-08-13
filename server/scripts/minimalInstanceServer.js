// Child process entrypoint used by multiInstanceDemo.js. Boots the real
// createApp() (src/app.js) without requiring a live MongoDB connection,
// since health/autocomplete/rate-limit are enough to demonstrate
// multi-instance routing and shared Redis state.
const { createApp } = require('../src/app');
const { config } = require('../src/config');

const app = createApp();
app.listen(config.port, () => {
  process.send('ready');
});
