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

type Mode = 'Normal' | 'Translation' | 'Summarization' | 'Math';
type ApiProvider = 'OpenAI' | 'Google' | 'Anthropic';

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('Welcome to AIutino! Enter a prompt to get started.');
  const [isThinking, setIsThinking] = useState(false);
  const [mode, setMode] = useState<Mode>('Normal');
  const [isListening, setIsListening] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [apiProvider, setApiProvider] = useState<ApiProvider>('OpenAI');
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [status, setStatus] = useState('Ready');


  const handleQueryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuery(e.target.value);
  };

  const handleSubmit = React.useCallback(async (text: string) => {
    if (!text.trim()) return;
    if (!apiKey) {
      setResponse('API key is not set. Please go to settings to add it.');
      setStatus('Error');
      return;
    }

    setIsThinking(true);
    setResponse(`Thinking about "${text}" in ${mode} mode...`);
    setStatus('Processing');

    try {
      const result = await ApiManager.fetchData(apiProvider, apiKey, text, mode);
      setResponse(result.message);
      setStatus('Ready');
    } catch (error) {
      console.error('An error occurred during fetch:', error);
      if (error instanceof Error) {
        setResponse(`Error: ${error.message}`);
      } else {
        setResponse('An unknown error occurred.');
      }
      setStatus('Error');
    } finally {
      setIsThinking(false);
      setQuery('');
    }
  }, [apiKey, apiProvider, mode]);

  const handleCaptureScreen = async () => {
    if (!query.trim()) {
      setResponse('Please enter a prompt for the screenshot.');
      return;
    }
    if (!apiKey) {
      setResponse('API key is not set. Please go to settings to add it.');
      setStatus('Error');
      return;
    }

    setIsThinking(true);
    setResponse('Capturing screen and analyzing...');
    setStatus('Processing');

    try {
      const screenshot = await window.electron.captureScreen();
      const result = await ApiManager.fetchDataWithImage(apiProvider, apiKey, query, screenshot);
      setResponse(result.message);
      setStatus('Ready');
    } catch (error) {
      console.error('An error occurred during fetch with image:', error);
      if (error instanceof Error) {
        setResponse(`Error: ${error.message}`);
      } else {
        setResponse('An unknown error occurred.');
      }
      setStatus('Error');
    } finally {
      setIsThinking(false);
      setQuery('');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(response);
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
      case 'Math':
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
          <p className={isThinking ? 'animate-pulse' : ''}>{response}</p>
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
            <option>Math</option>
          </Select>

          <div className="flex items-center space-x-2">
            <Button
              onClick={() => handleSubmit(query)}
              className="px-2 py-1 text-xs bg-green-500"
              disabled={isThinking}
            >
              Submit
            </Button>
            <Button
              onClick={toggleListen}
              className={`px-2 py-1 text-xs ${
                isListening ? 'bg-red-500 animate-pulse' : 'bg-blue-500'
              }`}
            >
              {isListening ? 'Listening...' : 'Voice'}
            </Button>
            <Button
              onClick={handleCaptureScreen}
              className="px-2 py-1 text-xs bg-purple-500"
              disabled={isThinking}
            >
              Capture Screen
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
