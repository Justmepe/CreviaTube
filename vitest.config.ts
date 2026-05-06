import { defineConfig } from "vitest/config";

export default defineConfig({
  // tsconfig.json sets jsx="preserve" because Vite's frontend pipeline expects
  // it. We point Vitest at tsconfig.test.json which overrides jsx="react-jsx"
  // so the backend TSX email templates compile correctly during tests.
  resolve: {
    tsconfigPaths: true as any,
  },
  test: {
    include: ["tests/**/*.test.ts"],
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 30_000,
    hookTimeout: 30_000,
    typecheck: { tsconfig: "./tsconfig.test.json" },
    env: {
      WEB3_MOCK_VERIFY: "true",
      SCHEDULER_DISABLED: "true",
    },
    setupFiles: ["./tests/setup.ts"],
  },
});
