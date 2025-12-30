// app.cjs
// CommonJS wrapper for Phusion Passenger to load the ESM application
(async () => {
  try {
    await import("./app.js");
  } catch (err) {
    console.error("Failed to load ESM app:", err);
    process.exit(1);
  }
})();
