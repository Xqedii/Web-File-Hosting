export default defineNitroPlugin((nitroApp) => {
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Error: ', reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('Error: ', err);
    if (err.message && err.message.includes('URL as target')) {
        return; 
    }
  });
});