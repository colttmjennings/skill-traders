import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.skilltraders.app",
  appName: "Skill Traders",
  webDir: "out",
  server: {
    url: "https://skill-traders.com/app",
    cleartext: false,
  },
};

export default config;
