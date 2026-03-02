import React, { useState, useRef } from 'react';
import { Upload, FileText, Settings, Play, CheckCircle2, Loader2, Leaf, Activity, Edit3, Eye } from 'lucide-react';
import Markdown from 'react-markdown';
import { extractTextFromPDF, fileToBase64 } from './lib/pdf';
import { parsePipelineYaml, runTask, PipelineConfig } from './lib/orchestrator';
import agentsYamlRaw from './agents.yaml?raw';
import skillMdRaw from './SKILL.md?raw';

type IngestionMode = 'A' | 'B';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [ingestionMode, setIngestionMode] = useState<IngestionMode>('A');
  const [mana, setMana] = useState(100);
  const [stress, setStress] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTask, setCurrentTask] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const runPipeline = async () => {
    if (!file) return;
    
    setIsRunning(true);
    setOutputs({});
    setActiveTab('overview');
    
    try {
      const config = parsePipelineYaml(agentsYamlRaw);
      let documentContext: string | { inlineData: { data: string; mimeType: string } };

      setCurrentTask('ingestion');
      
      if (ingestionMode === 'A') {
        // Option A: Extract text locally using pdfjs-dist
        documentContext = await extractTextFromPDF(file);
      } else {
        // Option B: Pass base64 to Gemini
        const base64 = await fileToBase64(file);
        documentContext = {
          inlineData: {
            data: base64,
            mimeType: file.type || 'application/pdf'
          }
        };
      }

      const currentOutputs: Record<string, string> = {};

      for (const stage of config.pipeline.stages) {
        setCurrentTask(stage.id);
        setActiveTab(stage.id);
        
        let taskOutput = '';
        
        await runTask(
          stage,
          skillMdRaw,
          documentContext,
          currentOutputs,
          (text) => {
            taskOutput = text;
            setOutputs(prev => ({ ...prev, [stage.id]: text }));
          }
        );
        
        currentOutputs[stage.id] = taskOutput;
        setMana(prev => Math.max(0, prev - 4));
        setStress(prev => Math.min(100, prev + 4));
      }

      setCurrentTask(null);
    } catch (error) {
      console.error("Pipeline Error:", error);
      alert("An error occurred during the pipeline execution. Check console for details.");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-emerald-50 text-emerald-950 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-emerald-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 p-2 rounded-xl">
            <Leaf className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-emerald-900">Swissmed Agentic AI</h1>
            <p className="text-sm text-emerald-600">510(k) Review Studio (Flower Edition V4.0)</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          {/* Mana Pool */}
          <div className="flex flex-col items-end">
            <span className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Mana Pool</span>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-emerald-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-400 transition-all duration-500"
                  style={{ width: `${mana}%` }}
                />
              </div>
              <span className="text-sm font-medium text-blue-600">{mana}/100</span>
            </div>
          </div>
          
          {/* Stress Meter */}
          <div className="flex flex-col items-end">
            <span className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Stress Level</span>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-emerald-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-rose-400 transition-all duration-500"
                  style={{ width: `${stress}%` }}
                />
              </div>
              <span className="text-sm font-medium text-rose-600">{stress}%</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-12 gap-8">
        
        {/* Sidebar Controls */}
        <div className="col-span-4 space-y-6">
          
          {/* Upload Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100">
            <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-emerald-500" />
              Upload Submission
            </h2>
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-emerald-200 rounded-xl p-8 text-center cursor-pointer hover:bg-emerald-50 transition-colors"
            >
              <FileText className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
              {file ? (
                <p className="font-medium text-emerald-700">{file.name}</p>
              ) : (
                <p className="text-emerald-600">Click to upload 510(k) PDF</p>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".pdf,.txt,.md"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* Settings Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100">
            <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-emerald-500" />
              Ingestion Settings
            </h2>
            
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 rounded-xl border border-emerald-100 cursor-pointer hover:bg-emerald-50 transition-colors">
                <input 
                  type="radio" 
                  name="ingestion" 
                  value="A" 
                  checked={ingestionMode === 'A'}
                  onChange={() => setIngestionMode('A')}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <p className="font-medium text-emerald-900">Option A: Pure Ephemeral (Local)</p>
                  <p className="text-sm text-emerald-600">Extract text locally using JS packages. Best for standard PDFs.</p>
                </div>
              </label>
              
              <label className="flex items-start gap-3 p-3 rounded-xl border border-emerald-100 cursor-pointer hover:bg-emerald-50 transition-colors">
                <input 
                  type="radio" 
                  name="ingestion" 
                  value="B" 
                  checked={ingestionMode === 'B'}
                  onChange={() => setIngestionMode('B')}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <p className="font-medium text-emerald-900">Option B: Gemini Multimodal</p>
                  <p className="text-sm text-emerald-600">Pass PDF directly to Gemini-3-Flash. Best for complex eSTAR PDFs.</p>
                </div>
              </label>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={runPipeline}
            disabled={!file || isRunning}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Orchestrating Pipeline...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Run Agentic Review
              </>
            )}
          </button>

          {/* Pipeline Progress */}
          {isRunning && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100">
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-500" />
                Pipeline Status
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {parsePipelineYaml(agentsYamlRaw).pipeline.stages.map(stage => (
                  <div key={stage.id} className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {outputs[stage.id] ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : currentTask === stage.id ? (
                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-emerald-200" />
                      )}
                    </div>
                    <div>
                      <span className={`text-sm block ${currentTask === stage.id ? 'font-medium text-emerald-900' : 'text-emerald-600'}`}>
                        {stage.icon} {stage.agent}
                      </span>
                      <span className="text-xs text-emerald-400">{stage.phase}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="col-span-8">
          <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 min-h-[600px] flex flex-col overflow-hidden">
            
            {/* Tabs */}
            <div className="flex overflow-x-auto border-b border-emerald-100 bg-emerald-50/50">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'overview' ? 'bg-white text-emerald-900 border-b-2 border-emerald-500' : 'text-emerald-600 hover:text-emerald-900'}`}
              >
                Overview
              </button>
              {Object.keys(outputs).map(taskId => (
                <button
                  key={taskId}
                  onClick={() => setActiveTab(taskId)}
                  className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${activeTab === taskId ? 'bg-white text-emerald-900 border-b-2 border-emerald-500' : 'text-emerald-600 hover:text-emerald-900'}`}
                >
                  {taskId}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="p-8 flex-1 overflow-y-auto flex flex-col">
              {activeTab === 'overview' ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-emerald-600">
                  <Leaf className="w-16 h-16 text-emerald-200 mb-4" />
                  <h2 className="text-xl font-medium text-emerald-900 mb-2">Welcome to the Garden</h2>
                  <p className="max-w-md">
                    Upload a 510(k) submission and click "Run Agentic Review" to begin the orchestrated pipeline.
                    All processing happens ephemerally in your browser.
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors"
                    >
                      {isEditing ? (
                        <><Eye className="w-4 h-4" /> Preview</>
                      ) : (
                        <><Edit3 className="w-4 h-4" /> Edit Report</>
                      )}
                    </button>
                  </div>
                  
                  {isEditing ? (
                    <textarea
                      value={outputs[activeTab] || ''}
                      onChange={(e) => setOutputs(prev => ({ ...prev, [activeTab]: e.target.value }))}
                      className="flex-1 w-full p-4 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none font-mono text-sm text-emerald-900"
                      placeholder="Report content..."
                    />
                  ) : (
                    <div className="prose prose-emerald max-w-none">
                      <Markdown>{outputs[activeTab] || 'Processing...'}</Markdown>
                    </div>
                  )}
                </div>
              )}
            </div>
            
          </div>
        </div>

      </main>
    </div>
  );
}
