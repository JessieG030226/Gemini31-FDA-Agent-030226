import { GoogleGenAI } from '@google/genai';
import yaml from 'js-yaml';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface PipelineStage {
  id: string;
  agent: string;
  icon: string;
  task: string;
  status: string;
  phase: string;
}

export interface PipelineConfig {
  pipeline: {
    version: string;
    stages: PipelineStage[];
  };
}

export function parsePipelineYaml(yamlString: string): PipelineConfig {
  return yaml.load(yamlString) as PipelineConfig;
}

export async function runTask(
  stage: PipelineStage,
  model: string,
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

Current Agent: ${stage.icon} ${stage.agent}
Phase: ${stage.phase}
Task: ${stage.task}

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
    model: model,
    contents: contents,
    config: {
      temperature: 0.05,
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
