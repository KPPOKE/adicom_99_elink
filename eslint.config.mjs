import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      "@next/next/no-img-element": "off",
      "react-hooks/purity": "off",
      "react-hooks/incompatible-library": "off"
    }
  },
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "public/uploads/**",
      "playwright-report/**",
      "test-results/**"
    ]
  }
];

export default config;
