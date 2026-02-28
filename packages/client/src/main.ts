import { createApp } from "./app.js";

async function main(): Promise<void> {
  const container = document.getElementById("app");
  if (!container) {
    throw new Error("Missing #app container element");
  }

  // Wait for Google Fonts to load before PixiJS renders text
  await document.fonts.ready;

  await createApp(container);
}

main().catch((error: unknown) => {
  console.error("Failed to start client:", error);
});
