import React, { useState, useEffect } from 'react';
import { Button } from './components/retroui/Button';
import { Select } from './components/retroui/Select';
import { Textarea } from './components/retroui/Textarea';
import { Card } from './components/retroui/Card';
import { Body } from './components/retroui/Body';
import { RadioGroup } from './components/retroui/RadioGroup';
import { Input } from './components/retroui/Input';
import ApiManager from './api';
import { startRecording, stopRecording, sendAudio } from './deepgram';
import CodeBubble from './components/retroui/CodeBubble';
import CodingModeOutput from './components/retroui/CodingModeOutput';

type Mode = 'Normal' | 'Translation' | 'Summarization' | 'Coding';
type ApiProvider = 'OpenAI' | 'Google' | 'Anthropic';
type CodingModeResponse = {
  problemTitle: string;
  clarifyingQuestions: { question: string; answer: string }[];
  edgeCases: { case: string; explanation?: string }[];
  optimalSolution: string;
  bruteForceSolution: string;
  language?: string;
};

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | CodingModeResponse>('Welcome to AIutino! Enter a prompt to get started.');
  const [isThinking, setIsThinking] = useState(false);
  const [mode, setMode] = useState<Mode>('Normal');
  const [isListening, setIsListening] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [apiProvider, setApiProvider] = useState<ApiProvider>('OpenAI');
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [status, setStatus] = useState('Ready');
  // Add state for screenshots
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const maxScreenshots = 3;


  const handleQueryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuery(e.target.value);
  };

  // Capture button: just capture and store, do not process
  const handleCapture = async () => {
    setStatus('Capturing...');
    setIsThinking(true);
    try {
      const shot = await window.electron.captureScreen();
      setScreenshots(prev => [...prev, shot]);
      setStatus('Ready');
    } catch {
      setStatus('Error');
    } finally {
      setIsThinking(false);
    }
  };

  const handleSubmit = React.useCallback(async (text: string) => {
    if (!apiKey) {
      setResponse('API key is not set. Please go to settings to add it.');
      setStatus('Error');
      return;
    }
    setIsThinking(true);
    setStatus('Processing');
    try {
      if (screenshots.length > 0) {
        // Use prompt if provided, else default
        let prompt = text.trim();
        if (!prompt) {
          prompt = mode === 'Coding' ? 'solve' : 'Analyze this screenshot';
        }
        // Only send the first screenshot for compatibility
        const result = await ApiManager.fetchDataWithImage(apiProvider, apiKey, prompt, screenshots[0]);
        setScreenshots([]);
        if (mode === 'Coding') {
          setResponse({
            problemTitle: 'Sample Problem: Two Sum',
            clarifyingQuestions: [
              { question: 'Are input numbers always positive?', answer: 'No, they can be any integers.' },
              { question: 'Can the same element be used twice?', answer: 'No, each index can only be used once.' },
              { question: 'Should the solution return indices or values?', answer: 'Return the indices of the two numbers.' }
            ],
            edgeCases: [
              { case: 'Empty input array', explanation: 'Should return no solution or error.' },
              { case: 'No valid pair exists', explanation: 'Should handle gracefully.' },
              { case: 'Multiple valid pairs', explanation: 'Should clarify which to return.' }
            ],
            optimalSolution: `# Optimal Solution\ndef two_sum(nums, target):\n    # Create a dictionary to store previously seen numbers and their indices\n    lookup = {}\n    for i, num in enumerate(nums):\n        # Check if the complement (target - num) exists in the dictionary\n        if target - num in lookup:\n            # If found, return the indices of the two numbers\n            return [lookup[target - num], i]\n        # Store the current number and its index in the dictionary\n        lookup[num] = i\n\n# This approach is efficient (O(n) time) because it only requires a single pass through the list.\n# Space Complexity: O(n)\n# Time Complexity: O(n)` ,
            bruteForceSolution: `# Brute-force Solution\ndef two_sum(nums, target):\n    # Check every possible pair of numbers\n    for i in range(len(nums)):\n        for j in range(i+1, len(nums)):\n            # If the pair sums to the target, return their indices\n            if nums[i] + nums[j] == target:\n                return [i, j]\n\n# This approach is simple but inefficient (O(n^2) time) because it checks all pairs.\n# Space Complexity: O(1)\n# Time Complexity: O(n^2)` ,
            language: 'python'
          });
        } else {
          setResponse(result.message);
        }
      } else {
        if (!text.trim()) return;
        const result = await ApiManager.fetchData(apiProvider, apiKey, text, mode);
        if (mode === 'Coding') {
          setResponse({
            problemTitle: 'Sample Problem: Two Sum',
            clarifyingQuestions: [
              { question: 'Are input numbers always positive?', answer: 'No, they can be any integers.' },
              { question: 'Can the same element be used twice?', answer: 'No, each index can only be used once.' },
              { question: 'Should the solution return indices or values?', answer: 'Return the indices of the two numbers.' }
            ],
            edgeCases: [
              { case: 'Empty input array', explanation: 'Should return no solution or error.' },
              { case: 'No valid pair exists', explanation: 'Should handle gracefully.' },
              { case: 'Multiple valid pairs', explanation: 'Should clarify which to return.' }
            ],
            optimalSolution: `# Optimal Solution\ndef two_sum(nums, target):\n    # Create a dictionary to store previously seen numbers and their indices\n    lookup = {}\n    for i, num in enumerate(nums):\n        # Check if the complement (target - num) exists in the dictionary\n        if target - num in lookup:\n            # If found, return the indices of the two numbers\n            return [lookup[target - num], i]\n        # Store the current number and its index in the dictionary\n        lookup[num] = i\n\n# This approach is efficient (O(n) time) because it only requires a single pass through the list.\n# Space Complexity: O(n)\n# Time Complexity: O(n)` ,
            bruteForceSolution: `# Brute-force Solution\ndef two_sum(nums, target):\n    # Check every possible pair of numbers\n    for i in range(len(nums)):\n        for j in range(i+1, len(nums)):\n            # If the pair sums to the target, return their indices\n            if nums[i] + nums[j] == target:\n                return [i, j]\n\n# This approach is simple but inefficient (O(n^2) time) because it checks all pairs.\n# Space Complexity: O(1)\n# Time Complexity: O(n^2)` ,
            language: 'python'
          });
        } else {
          setResponse(result.message);
        }
      }
      setStatus('Ready');
      setQuery('');
    } catch (error) {
      setResponse('An error occurred during fetch.');
      setStatus('Error');
    } finally {
      setIsThinking(false);
    }
  }, [apiKey, apiProvider, mode, screenshots]);

  const handleCopy = () => {
    if (typeof response === 'string') {
      navigator.clipboard.writeText(response);
    } else {
      // Copy all code blocks if CodingModeResponse
      const allCode = [
        response.problemTitle,
        'Clarifying Questions:',
        ...response.clarifyingQuestions,
        'Edge Cases to Consider:',
        ...response.edgeCases.map(ec => `${ec.case}${ec.explanation ? ' — ' + ec.explanation : ''}`),
        'Optimal Solution:',
        response.optimalSolution,
        'Brute-force Solution:',
        response.bruteForceSolution
      ].join('\n\n');
      navigator.clipboard.writeText(allCode);
    }
    setStatus('Copied to clipboard!');
    setTimeout(() => setStatus('Ready'), 2000);
  };

  const handleSaveSettings = () => {
    if (!apiKey) {
      alert('Please enter an API key.');
      return;
    }
    localStorage.setItem('apiProvider', apiProvider);
    localStorage.setItem('apiKey', apiKey);
    setShowSettings(false);
    setStatus(apiKey ? 'Ready' : 'Not Set');
  };

  useEffect(() => {
    const savedProvider = localStorage.getItem('apiProvider') as ApiProvider;
    const savedApiKey = localStorage.getItem('apiKey');
    if (savedProvider) {
      setApiProvider(savedProvider);
    }
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
    setStatus(savedApiKey ? 'Ready' : 'Not Set');
  }, []);

  useEffect(() => {
    const width = 400;
    const height = showSettings ? 600 : 350;
    window.electron.ipcRenderer.send('resize-window', { width, height });
  }, [showSettings]);

  const toggleListen = async () => {
    if (isListening) {
      mediaRecorder?.stop();
      stopRecording();
      setIsListening(false);
    } else {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        sendAudio(e.data);
      };
      recorder.start(1000);
      setMediaRecorder(recorder);
      startRecording((transcript) => {
        setQuery(transcript);
        if (transcript) {
          handleSubmit(transcript);
        }
      });
      setIsListening(true);
    }
  };

  const getModeColor = () => {
    switch (mode) {
      case 'Normal':
        return 'border-blue-500';
      case 'Translation':
        return 'border-green-500';
      case 'Summarization':
        return 'border-yellow-500';
      case 'Coding':
        return 'border-red-500';
      default:
        return 'border-gray-600';
    }
  };

  return (
    <Body>
      <Card
        className={`w-full h-full flex flex-col ${getModeColor()}`}
        style={{ imageRendering: 'pixelated' }}
      >
        {/* Draggable Title Bar */}
        <div
          className="grid grid-cols-3 items-center bg-gray-700 py-1 text-sm font-bold cursor-move"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          <div />
          <span className="text-center">AIutino - {mode}</span>
          <button
            onClick={() => window.electron.ipcRenderer.send('close-app')}
            className="justify-self-end h-full px-4 flex items-center text-white bg-red-500 hover:bg-red-700"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            X
          </button>
        </div>

        {/* Response Area */}
        <div className="flex-grow p-2 bg-gray-900 overflow-y-auto text-sm relative">
          {mode === 'Coding' && typeof response === 'object' && response !== null ? (
            <CodingModeOutput
              problemTitle={response.problemTitle}
              clarifyingQuestions={response.clarifyingQuestions}
              edgeCases={response.edgeCases}
              optimalSolution={response.optimalSolution}
              bruteForceSolution={response.bruteForceSolution}
              language={response.language || 'python'}
            />
          ) : (
            typeof response === 'string' && <p className={isThinking ? 'animate-pulse' : ''}>{response}</p>
          )}
          {response && response !== '...' && !isThinking && (
            <Button
              onClick={handleCopy}
              className="absolute top-2 right-2 px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500"
            >
              Copy
            </Button>
          )}
        </div>

        {/* Input Area */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(query);
          }}
          className="p-2 bg-gray-700"
        >
          <Textarea
            value={query}
            onChange={handleQueryChange}
            placeholder="Enter your command..."
            className="w-full"
            disabled={isThinking}
            rows={mode === 'Summarization' ? 4 : 1}
          />
        </form>

        {/* Controls */}
        <div className="flex items-center justify-between p-2 bg-gray-800">
          <Select
            value={mode}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setMode(e.target.value as Mode)
            }
            className="text-xs"
          >
            <option>Normal</option>
            <option>Translation</option>
            <option>Summarization</option>
            <option>Coding</option>
          </Select>

          <div className="flex items-center space-x-2">
            <Button
              onClick={handleCapture}
              className="px-2 py-1 text-xs bg-purple-500"
              disabled={isThinking || screenshots.length >= maxScreenshots}
            >
              {`Capture (${screenshots.length + 1}/${maxScreenshots})`}
            </Button>
            <Button
              onClick={() => handleSubmit(query)}
              className="px-2 py-1 text-xs bg-green-500"
              disabled={isThinking}
            >
              Submit
            </Button>
            <Button
              onClick={toggleListen}
              className={`px-2 py-1 text-xs ${isListening ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`}
            >
              {isListening ? 'Listening...' : 'Voice'}
            </Button>
            <Button
              onClick={() => {
                setResponse('Welcome to AIutino! Enter a prompt to get started.');
                setScreenshots([]);
                setQuery('');
                setStatus('Ready');
                setShowSettings(false);
                window.electron.ipcRenderer.send('reload-app');
              }}
              className="px-2 py-1 text-xs bg-gray-500 hover:bg-blue-400 text-white"
              title="Reload App"
            >
              Reload
            </Button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="bg-gray-600 text-xs text-center py-1 flex justify-between px-2">
          <span>Status: {status}</span>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-xs hover:underline"
          >
            Settings
          </button>
        </div>

        {showSettings && (
          <div className="pt-4">
            <Card className="w-[380px]">
              <div
                className="grid grid-cols-3 items-center bg-gray-700 py-1 text-sm font-bold cursor-move"
                style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
              >
                <div />
                <span className="text-center">Settings</span>
                <button
                  onClick={() => setShowSettings(false)}
                  className="justify-self-end h-full px-4 flex items-center text-white bg-red-500 hover:bg-red-700"
                  style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                >
                  X
                </button>
              </div>
              <div className="p-4 space-y-4">
                <RadioGroup
                  label="API Provider"
                  options={['OpenAI', 'Google', 'Anthropic']}
                  selectedValue={apiProvider}
                  onChange={(value) => setApiProvider(value as ApiProvider)}
                />
                <Input
                  label={`Enter ${apiProvider} API Key`}
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                />
                <div className="flex justify-end space-x-2 pt-2">
                  <Button
                    onClick={() => setShowSettings(false)}
                    className="bg-gray-600"
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSaveSettings} className="bg-blue-500">
                    Save
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </Card>
    </Body>
  );
};

export default App;
