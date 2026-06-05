import type { AlgrafRuntime } from "algraf-wasm";
import type { PdlEditorServiceResult, PdlNamedOutput, PdlRunResult, PdlRuntime } from "pdl-wasm";

import type { StoryBundle, StoryStep } from "./storyBundles";
import type { StepSnapshots } from "./studioTypes";
import { emptyEditorResponse, tableToCsv } from "./studioUtils";

export function runSharedStoryProgram(
  story: StoryBundle,
  pdlRuntime: PdlRuntime,
  algrafRuntime: AlgrafRuntime,
  files: Record<string, string>,
  algrafSources: Record<string, string>,
): StepSnapshots {
  const pdlEditorResponses = editorResponsesForSteps(story, pdlRuntime, files, defaultPdlSources(story));
  const storyRun = pdlRuntime.run(story.storyProgramSource, files, { programPath: story.storyProgramPath });
  const outputsByName = new Map(storyRun.outputs.map((output) => [output.name, output]));
  const nextSnapshots: StepSnapshots = {};

  for (const step of story.steps) {
    const output = outputsByName.get(step.outputName) ?? null;
    const pdlCsv = pdlRunResultForSavedFile(storyRun, output, step);
    const preparedCsv = pdlCsv.stdout ?? "";
    const algrafSource = algrafSources[step.id] ?? step.algrafSource;
    const algrafFiles = preparedCsv
      ? filesWithPreparedOutput(files, step, preparedCsv, outputsByName, storyRun.files)
      : filesWithSupportingFiles(files, step);
    const algrafResult = preparedCsv ? algrafRuntime.render(algrafSource, algrafFiles) : null;
    const pdlEditorResponse = pdlEditorResponses[step.id] ?? emptyEditorResponse();

    nextSnapshots[step.id] = {
      pdlDisplay: pdlCsv,
      pdlCsv,
      pdlDiagnostics: pdlEditorResponse.diagnostics,
      algrafResult,
      algrafDiagnostics: algrafResult?.diagnostics ?? [],
      error: pdlEditorResponse.error ?? pdlCsv.error ?? algrafResult?.error ?? null,
    };
  }

  return nextSnapshots;
}

export function runPerStepPrograms(
  story: StoryBundle,
  pdlRuntime: PdlRuntime,
  algrafRuntime: AlgrafRuntime,
  files: Record<string, string>,
  pdlSources: Record<string, string>,
  algrafSources: Record<string, string>,
): StepSnapshots {
  const nextSnapshots: StepSnapshots = {};

  for (const step of story.steps) {
    const pdlSource = pdlSources[step.id] ?? step.pdlSource;
    const algrafSource = algrafSources[step.id] ?? step.algrafSource;
    const pdlEditorResponse: PdlEditorServiceResult = pdlRuntime.editorService(
      pdlSource,
      files,
      { kind: "diagnostics" },
      step.programPath,
    );
    const pdlCsv = pdlRuntime.run(pdlSource, files, {
      stdoutFormat: "csv",
      programPath: step.programPath,
    });
    const preparedCsv = pdlCsv.stdout ?? "";
    const algrafFiles = preparedCsv ? filesWithPreparedOutput(files, step, preparedCsv, undefined, pdlCsv.files) : filesWithSupportingFiles(files, step);
    const algrafResult = preparedCsv ? algrafRuntime.render(algrafSource, algrafFiles) : null;

    nextSnapshots[step.id] = {
      pdlDisplay: pdlCsv,
      pdlCsv,
      pdlDiagnostics: pdlEditorResponse.diagnostics,
      algrafResult,
      algrafDiagnostics: algrafResult?.diagnostics ?? [],
      error: pdlEditorResponse.error ?? pdlCsv.error ?? algrafResult?.error ?? null,
    };
  }

  return nextSnapshots;
}

export function filesWithPreparedOutput(
  files: Record<string, string>,
  step: StoryStep,
  preparedCsv: string,
  outputsByName?: Map<string, PdlNamedOutput>,
  savedFiles?: Record<string, string>,
): Record<string, string> {
  const nextFiles = filesWithSupportingFiles(files, step);
  for (const supportingOutput of step.supportingOutputs ?? []) {
    const savedFile = savedFiles?.[supportingOutput.dataFile];
    const output = outputsByName?.get(supportingOutput.outputName);
    if (savedFile != null) {
      nextFiles[supportingOutput.dataFile] = savedFile;
    } else if (output) {
      nextFiles[supportingOutput.dataFile] = tableToCsv(output);
    }
  }
  return {
    ...nextFiles,
    ...(savedFiles ?? {}),
    "prepared.csv": preparedCsv,
    [step.dataFile]: preparedCsv,
  };
}

export function filesWithSupportingFiles(files: Record<string, string>, step: StoryStep): Record<string, string> {
  return {
    ...files,
    ...(step.supportingFiles ?? {}),
  };
}

export function modelUriForProgramPath(programPath: string): string {
  return `inmemory://datafarm/${programPath.replace(/^memory\/+/, "")}`;
}

function editorResponsesForSteps(
  story: StoryBundle,
  pdlRuntime: PdlRuntime,
  files: Record<string, string>,
  pdlSources: Record<string, string>,
): Record<string, PdlEditorServiceResult> {
  return Object.fromEntries(
    story.steps.map((step) => [
      step.id,
      pdlRuntime.editorService(pdlSources[step.id] ?? step.pdlSource, files, { kind: "diagnostics" }, step.programPath),
    ]),
  );
}

function defaultPdlSources(story: StoryBundle): Record<string, string> {
  return Object.fromEntries(story.steps.map((step) => [step.id, step.pdlSource]));
}

function pdlRunResultForNamedOutput(storyRun: PdlRunResult, output: PdlNamedOutput | null, step: StoryStep): PdlRunResult {
  const missingOutputError = !storyRun.error && !output ? `missing named PDL output \`${step.outputName}\`` : null;
  return {
    stdout: output ? tableToCsv(output) : "",
    files: storyRun.files,
    outputs: output ? [output] : [],
    diagnostics: storyRun.diagnostics,
    error: storyRun.error ?? missingOutputError,
  };
}

function pdlRunResultForSavedFile(storyRun: PdlRunResult, output: PdlNamedOutput | null, step: StoryStep): PdlRunResult {
  const savedFile = storyRun.files?.[step.dataFile];
  if (savedFile != null) {
    return {
      stdout: savedFile,
      files: storyRun.files,
      outputs: output ? [output] : [],
      diagnostics: storyRun.diagnostics,
      error: storyRun.error,
    };
  }

  return pdlRunResultForNamedOutput(storyRun, output, step);
}
