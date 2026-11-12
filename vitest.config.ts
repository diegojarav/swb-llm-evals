import { defineConfig } from "vitest/config";

// Plain Node tests, no setup files. The only network used is localhost
// (test/reproduce.test.ts starts a fake server on it).
export default defineConfig({
    test: {
        environment: "node",
        include: ["test/**/*.test.ts"],
    },
});
