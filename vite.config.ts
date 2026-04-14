import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    base: env.VITE_BASE_PATH || "/distribution-control/",
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            firebase: ["firebase/app", "firebase/auth", "firebase/firestore"],
            react: ["react", "react-dom"]
          }
        }
      }
    },
    test: {
      environment: "node",
      globals: true
    }
  };
});
