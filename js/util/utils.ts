export function empty(node: HTMLElement) {
  var n;
  while ((n = node.firstElementChild)) {
    node.removeChild(n);
  }
}

export function once(fn) {
  let value = null;
  return () => {
    if (value) return value;
    return (value = fn());
  };
}

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
