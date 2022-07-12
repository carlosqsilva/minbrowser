type ConfigType = LooseType<
  "lang" | "type" | "app-name" | "app-path" | "app-version" | "user-data-path"
>;

const config: Map<ConfigType, any> = new Map();
export const getConfig = (configKey: ConfigType) => {
  if (!config.has(configKey)) {
    for (const arg of process.argv) {
      const [key, value] = arg.split("=");
      config.set(key, value || (key && !value));
    }
  }

  return config.get(configKey) || "";
};
