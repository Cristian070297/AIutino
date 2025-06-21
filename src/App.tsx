import React, { useState, useEffect, useRef } from 'react';
import { Button } from './components/retroui/Button';
import { Select } from './components/retroui/Select';
import { Textarea } from './components/retroui/Textarea';
import { Card } from './components/retroui/Card';
import { Body } from './components/retroui/Body';

type Mode = 'Normal' | 'Translation' | 'Summarization' | 'Math';

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('...');
  const [isThinking, setIsThinking] = useState(false);
  const [mode, setMode] = useState<Mode>('Normal');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        handleSubmit(transcript);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error', event);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition as SpeechRecognition;
    }
  }, []);

  const handleQueryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuery(e.target.value);
  };

  const handleSubmit = (text: string) => {
    if (!text.trim()) return;

    setIsThinking(true);
    setResponse(`Thinking about "${text}" in ${mode} mode...`);

    // Simulate API call
    setTimeout(() => {
      setResponse(`Response for: "${text}"`);
      setIsThinking(false);
      setQuery('');
    }, 2000);
  };

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
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
          className="bg-gray-700 text-center py-1 text-sm font-bold cursor-move"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          AIutino - {mode}
        </div>

        {/* Response Area */}
        <div className="flex-grow p-2 bg-gray-900 overflow-y-auto text-sm">
          <p className={isThinking ? 'animate-pulse' : ''}>{response}</p>
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

          <Button
            onClick={toggleListen}
            className={`px-2 py-1 text-xs ${
              isListening ? 'bg-red-500 animate-pulse' : 'bg-blue-500'
            }`}
          >
            {isListening ? 'Listening...' : 'Voice'}
          </Button>
        </div>

        {/* Status Bar */}
        <div className="bg-gray-600 text-xs text-center py-1">
          Status: {isThinking ? 'Processing' : 'Ready'}
        </div>
      </Card>
    </Body>
  );
};

export default App;
