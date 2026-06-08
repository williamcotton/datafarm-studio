// Owns the active data source for the IDE preparation panels.
//
// Holds: dataSource (text), sourcePath, sourceName, sourceLanguage (csv|json),
// and the CSV/JSON file input refs. Provides upload handlers that read the
// chosen file and reset the active source. Callers wire the SQL workspace's
// "ide-source" reset via the optional onSourceReset callback so SQL state
// follows the new IDE source. No runtime adapters consumed.

import React from "react";

import { IDE_DATA_PATH, type IdeSourceLanguage } from "../idePdlWorkflow";

const DEFAULT_IDE_DATA = `day,value,segment
1,18,Baseline
2,34,Baseline
3,48,Growth
4,61,Growth
5,73,Peak
6,88,Peak
`;

export interface IdeDataSourceApi {
  dataSource: string;
  setDataSource: React.Dispatch<React.SetStateAction<string>>;
  sourcePath: string;
  sourceName: string;
  sourceLanguage: IdeSourceLanguage;
  csvInputRef: React.MutableRefObject<HTMLInputElement | null>;
  jsonInputRef: React.MutableRefObject<HTMLInputElement | null>;
  handleCsvUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleJsonUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export function useIdeDataSource(onSourceReset?: () => void): IdeDataSourceApi {
  const [dataSource, setDataSource] = React.useState(DEFAULT_IDE_DATA);
  const [sourcePath, setSourcePath] = React.useState(IDE_DATA_PATH);
  const [sourceName, setSourceName] = React.useState(IDE_DATA_PATH);
  const [sourceLanguage, setSourceLanguage] = React.useState<IdeSourceLanguage>("csv");
  const csvInputRef = React.useRef<HTMLInputElement | null>(null);
  const jsonInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleCsvUpload = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0] ?? null;
      event.currentTarget.value = "";
      if (!file) {
        return;
      }

      const source = await file.text();
      setSourcePath(IDE_DATA_PATH);
      setSourceName(file.name);
      setSourceLanguage("csv");
      setDataSource(source);
      onSourceReset?.();
    },
    [onSourceReset],
  );

  const handleJsonUpload = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0] ?? null;
      event.currentTarget.value = "";
      if (!file) {
        return;
      }

      const source = await file.text();
      const nextPath = file.name || (file.type === "application/json" ? "source.json" : "source.ljson");
      setSourcePath(nextPath);
      setSourceName(file.name || nextPath);
      setSourceLanguage("json");
      setDataSource(source);
      onSourceReset?.();
    },
    [onSourceReset],
  );

  return {
    dataSource,
    setDataSource,
    sourcePath,
    sourceName,
    sourceLanguage,
    csvInputRef,
    jsonInputRef,
    handleCsvUpload,
    handleJsonUpload,
  };
}
