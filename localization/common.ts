interface Translation {
  name: string;
  identifier: string;
  rtl?: boolean;
  translations: Record<string, string>;
}

export const languages: Record<string, Translation> = {
  "en-US": require("./languages/en-US"),
  "pt-BR": require("./languages/pt-BR"),
};
