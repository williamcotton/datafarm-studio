// Owns per-story source state for the case-study pages.
//
// Holds: rawDataByStory, pdlSourcesByStory, algrafSourcesByStory and their
// setters keyed by StoryId, plus the change handlers that scope each edit to
// the active story. Story switching preserves per-story edits; clearing the
// runtime snapshots is the caller's responsibility.

import React from "react";

import {
  createDefaultRawDataByStory,
  createDefaultSourcesByStory,
  type RawDataFile,
  type StoryId,
} from "../storyBundles";

export interface StoryStateApi {
  rawDataByStory: Record<StoryId, Record<string, string>>;
  pdlSourcesByStory: Record<StoryId, Record<string, string>>;
  algrafSourcesByStory: Record<StoryId, Record<string, string>>;
  handleRawDataChange: (rawFile: RawDataFile, value: string) => void;
  handlePdlSourceChange: (stepId: string, value: string) => void;
  handleAlgrafSourceChange: (stepId: string, value: string) => void;
}

export function useStoryState(activeStoryId: StoryId): StoryStateApi {
  const [rawDataByStory, setRawDataByStory] = React.useState<Record<StoryId, Record<string, string>>>(() =>
    createDefaultRawDataByStory(),
  );
  const [pdlSourcesByStory, setPdlSourcesByStory] = React.useState<Record<StoryId, Record<string, string>>>(() =>
    createDefaultSourcesByStory("pdl"),
  );
  const [algrafSourcesByStory, setAlgrafSourcesByStory] = React.useState<Record<StoryId, Record<string, string>>>(() =>
    createDefaultSourcesByStory("algraf"),
  );

  const handleRawDataChange = React.useCallback(
    (rawFile: RawDataFile, value: string) => {
      setRawDataByStory((current) => ({
        ...current,
        [activeStoryId]: {
          ...(current[activeStoryId] ?? {}),
          [rawFile.id]: value,
        },
      }));
    },
    [activeStoryId],
  );

  const handlePdlSourceChange = React.useCallback(
    (stepId: string, value: string) => {
      setPdlSourcesByStory((current) => ({
        ...current,
        [activeStoryId]: {
          ...(current[activeStoryId] ?? {}),
          [stepId]: value,
        },
      }));
    },
    [activeStoryId],
  );

  const handleAlgrafSourceChange = React.useCallback(
    (stepId: string, value: string) => {
      setAlgrafSourcesByStory((current) => ({
        ...current,
        [activeStoryId]: {
          ...(current[activeStoryId] ?? {}),
          [stepId]: value,
        },
      }));
    },
    [activeStoryId],
  );

  return {
    rawDataByStory,
    pdlSourcesByStory,
    algrafSourcesByStory,
    handleRawDataChange,
    handlePdlSourceChange,
    handleAlgrafSourceChange,
  };
}
