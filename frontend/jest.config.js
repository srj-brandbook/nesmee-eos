const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

module.exports = createJestConfig({
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^form-engine$": "<rootDir>/../shared/form-engine/index.js",
  },
  testPathIgnorePatterns: ["<rootDir>/e2e/", "<rootDir>/.next/"],
});
