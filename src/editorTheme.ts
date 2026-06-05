import { defaultPdlTheme } from "pdl-editor";
import type * as monaco from "monaco-editor/esm/vs/editor/editor.api";

export const DATAFARM_EDITOR_THEME_NAME = "datafarm-studio-light";

const baseTheme = defaultPdlTheme();

export const DATAFARM_EDITOR_THEME = {
  ...baseTheme,
  rules: [
    ...baseTheme.rules,
    { token: "keyword.ts", foreground: "166f5c", fontStyle: "bold" },
    { token: "keyword.tsx", foreground: "166f5c", fontStyle: "bold" },
    { token: "string.ts", foreground: "7a4a10" },
    { token: "string.tsx", foreground: "7a4a10" },
    { token: "number.ts", foreground: "b42318" },
    { token: "number.tsx", foreground: "b42318" },
    { token: "comment.ts", foreground: "6b7280", fontStyle: "italic" },
    { token: "comment.tsx", foreground: "6b7280", fontStyle: "italic" },
    { token: "type.identifier.ts", foreground: "7c3aed", fontStyle: "bold" },
    { token: "type.identifier.tsx", foreground: "7c3aed", fontStyle: "bold" },
    { token: "identifier.ts", foreground: "355f8c" },
    { token: "identifier.tsx", foreground: "355f8c" },
    { token: "delimiter.ts", foreground: "68757d" },
    { token: "delimiter.tsx", foreground: "68757d" },
    { token: "delimiter.angle", foreground: "68757d" },
    { token: "operator.ts", foreground: "4f5b63" },
    { token: "operator.tsx", foreground: "4f5b63" },
    { token: "tag", foreground: "0f5f8f", fontStyle: "bold" },
    { token: "tag.tsx", foreground: "0f5f8f", fontStyle: "bold" },
    { token: "attribute.name", foreground: "9a5512" },
    { token: "attribute.name.tsx", foreground: "9a5512" },
  ],
} satisfies monaco.editor.IStandaloneThemeData;
