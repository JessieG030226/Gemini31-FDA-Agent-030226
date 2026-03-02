import { GoogleGenAI } from '@google/genai';
import yaml from 'js-yaml';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface PipelineTask {
  id: string;
  description: string;
}

export interface PipelineConfig {
  name: string;
  version: string;
  description: string;
  orchestrator: {
    provider: string;
    model: string;
    temperature: number;
    max_tokens: number;
  };
  tasks: PipelineTask[];
}

export function parsePipelineYaml(yamlString: string): PipelineConfig {
  return yaml.load(yamlString) as PipelineConfig;
}

export async function runTask(
  task: PipelineTask,
  config: PipelineConfig,
  skillMd: string,
  documentContext: string | { inlineData: { data: string; mimeType: string } },
  previousOutputs: Record<string, string>,
  onProgress: (text: string) => void
): Promise<string> {
  const prompt = `
System Knowledge (SKILL.md):
${skillMd}

Previous Task Outputs:
${JSON.stringify(previousOutputs, null, 2)}

Current Task: ${task.id}
Description: ${task.description}

Please execute this task based on the provided document context.
Output your reasoning in <thinking> tags first, then the final Markdown report.
`;

  const contents: any[] = [];
  
  if (typeof documentContext === 'string') {
    contents.push({ text: `Document Context:\n${documentContext}` });
  } else {
    contents.push(documentContext);
    contents.push({ text: "Please analyze the attached document." });
  }
  
  contents.push({ text: prompt });

  const responseStream = await ai.models.generateContentStream({
    model: config.orchestrator.model || 'gemini-3-flash-preview',
    contents: contents,
    config: {
      temperature: config.orchestrator.temperature || 0.05,
    }
  });

  let fullText = '';
  for await (const chunk of responseStream) {
    if (chunk.text) {
      fullText += chunk.text;
      onProgress(fullText);
    }
  }
  
  return fullText;
}
