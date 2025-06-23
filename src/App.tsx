import React, { useState, useEffect } from 'react';
import { Button } from './components/retroui/Button';
import { Select } from './components/retroui/Select';
import { Textarea } from './components/retroui/Textarea';
import { Card } from './components/retroui/Card';
import { Body } from './components/retroui/Body';
import { RadioGroup } from './components/retroui/RadioGroup';
import { Input } from './components/retroui/Input';
import ApiManager from './api';
import { startRecording, stopRecording, sendAudio, getSocketState } from './deepgram';
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

type ContextEntry = {
  id: string;
  timestamp: number;
  type: 'initial' | 'follow-up';
  screenshots: string[];
  prompt: string;
  mode: Mode;
  response: string | CodingModeResponse;
  apiProvider: ApiProvider;
};

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | CodingModeResponse>('Welcome to AIutino! Enter a prompt to get started.');
  const [isThinking, setIsThinking] = useState(false);
  const [mode, setMode] = useState<Mode>('Normal');
  const [isListening, setIsListening] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [apiProvider, setApiProvider] = useState<ApiProvider>('OpenAI');
  const [apiKey, setApiKey] = useState('');  const [showSettings, setShowSettings] = useState(false);
  const [status, setStatus] = useState('Ready');
  // Add state for screenshots
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [language, setLanguage] = useState('en'); // Default to general English for best accent support
  const maxScreenshots = 3;
    // Context preservation state
  const [conversationContext, setConversationContext] = useState<ContextEntry[]>([]);
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  const handleQueryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuery(e.target.value);
  };
  // Context management utilities
  const generateContextId = React.useCallback(() => 
    `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, []);
    const isFollowUpQuestion = React.useCallback((text: string): boolean => {
    const followUpMarkers = [
      'what about', 'can you explain', 'why does', 'how does', 'what if',
      'the previous', 'that code', 'last image', 'this solution', 'your answer',
      'the screenshot', 'above solution', 'earlier response', 'the problem',
      'provide me with', 'i need to see', 'show me', 'what you\'re referring to',
      'from the image', 'in the picture', 'that image', 'this image',
      'follow-up', 'more details', 'detailed analysis', 'switch modes'
    ];
    const lowerText = text.toLowerCase();
    return followUpMarkers.some(marker => lowerText.includes(marker)) || 
           (conversationContext.length > 0 && text.length < 100); // Short questions likely follow-ups
  }, [conversationContext.length]);

  const cleanupOldContext = React.useCallback(() => {
    const now = Date.now();
    setConversationContext(prev => 
      prev.filter(entry => now - entry.timestamp < SESSION_TIMEOUT)
    );
  }, [SESSION_TIMEOUT]);
  const addToContext = React.useCallback((entry: ContextEntry) => {
    cleanupOldContext();
    setConversationContext(prev => [...prev, entry]);
  }, [cleanupOldContext]);

  const getRecentContext = React.useCallback((): ContextEntry[] => {
    cleanupOldContext();
    return conversationContext.slice(-3); // Keep last 3 entries for context
  }, [conversationContext, cleanupOldContext]);
  const buildContextualPrompt = React.useCallback((userPrompt: string, isFollowUp: boolean): string => {
    if (!isFollowUp) return userPrompt;
    
    const recentContext = getRecentContext();
    if (recentContext.length === 0) return userPrompt;
      let contextPrompt = "IMPORTANT: This is a follow-up question to a previous conversation. Here's the context:\n\n";
    
    recentContext.forEach((entry, index) => {
      contextPrompt += `${index + 1}. User previously asked: "${entry.prompt}"\n`;
      if (typeof entry.response === 'string') {
        const responsePreview = entry.response.substring(0, 400);
        contextPrompt += `AI previously responded: "${responsePreview}${entry.response.length > 400 ? '...' : ''}"\n`;
      } else {
        contextPrompt += `AI provided coding solution for: "${entry.response.problemTitle}"\n`;
        contextPrompt += `Previous solution included: ${entry.response.optimalSolution.substring(0, 300)}...\n`;
      }
      if (entry.screenshots.length > 0) {
        contextPrompt += `CRITICAL: A screenshot was analyzed in this previous interaction.\n`;
      }
      contextPrompt += `Mode used: ${entry.mode}\n\n`;
    });
      contextPrompt += `Current follow-up question: "${userPrompt}"\n\n`;
    contextPrompt += "INSTRUCTIONS: Please respond to this follow-up question while referencing the previous conversation context and any screenshots that were analyzed. If the user is asking about 'the screenshot', 'the image', or referring to previous content, use the context above to provide a relevant response. Provide specific, actionable information with concrete details, names, URLs, recommendations, and practical next steps. Avoid generic advice like 'search for' or 'you might need to research' - instead give direct, detailed answers.";
      return contextPrompt;
  }, [getRecentContext]);

  // Generate mode-specific prompts for automatic screenshot processing
  const getAutoPromptForMode = React.useCallback((mode: Mode): string => {
    switch (mode) {
      case 'Normal':
        return 'Analyze this screenshot in detail and provide specific, actionable information. Include concrete details, names, URLs, specific recommendations, and practical next steps. Avoid generic advice like "search for" or "you might need to research" - instead provide direct answers and specific solutions.';
      case 'Translation':
        return 'Identify and translate any text visible in this screenshot. If multiple languages are detected, translate everything to English. Provide the original text and translations in a clear, organized format.';
      case 'Summarization':
        return 'Summarize the key information, content, or data visible in this screenshot in a detailed yet concise manner. Include specific facts, numbers, names, and actionable points rather than general statements.';
      case 'Coding':
        return 'Analyze this screenshot for any coding problems, algorithms, or technical content. If it contains a coding problem, provide complete, working solutions with explanations. Include multiple approaches, complexity analysis, and best practices.';
      default:
        return 'Analyze this screenshot and provide specific, detailed, and actionable information.';
    }
  }, []);
  // Capture button: capture and store screenshots
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
    }  };
  const handleSubmit = React.useCallback(async (text: string) => {
    if (!apiKey) {
      setResponse('API key is not set. Please go to settings to add it.');
      setStatus('Error');
      return;
    }
    
    setIsThinking(true);
    setStatus('Processing');    
    const isFollowUp = isFollowUpQuestion(text);
    const contextualPrompt = buildContextualPrompt(text, isFollowUp);
    const entryId = generateContextId();
    
    if (isFollowUp) {
      setStatus('Processing with context...');
    }
    
    try {
      let result;
      let currentScreenshots = screenshots;
        // For follow-ups, include previous screenshots if none are currently captured
      if (isFollowUp && screenshots.length === 0) {
        const recentContext = getRecentContext();
        const lastEntryWithScreenshots = recentContext.find(entry => entry.screenshots.length > 0);
        if (lastEntryWithScreenshots) {
          currentScreenshots = lastEntryWithScreenshots.screenshots;
          console.log('Using previous screenshot for follow-up question');
        }
      }      if (currentScreenshots.length > 0) {
        // Use contextual prompt for better continuity
        const prompt = isFollowUp ? contextualPrompt : (text.trim() || getAutoPromptForMode(mode));
        
        console.log('Sending request with screenshot. IsFollowUp:', isFollowUp);
        if (isFollowUp) {
          console.log('Follow-up prompt:', prompt.substring(0, 200) + '...');
        }
        
        // Only send the first screenshot for compatibility
        result = await ApiManager.fetchDataWithImage(apiProvider, apiKey, prompt, currentScreenshots[0], mode);
        
        // Only clear screenshots if they were newly captured (not from context)
        if (screenshots.length > 0) {
          setScreenshots([]);
        }
        
        if (mode === 'Coding') {
          const codingResponse: CodingModeResponse = {
            problemTitle: isFollowUp ? `Follow-up: ${text}` : 'Detected Problem from Screenshot',
            clarifyingQuestions: [
              { question: 'What specific aspect would you like me to focus on?', answer: 'Please specify your preference.' },
              { question: 'Should I explain the solution approach?', answer: 'Yes, provide detailed explanation.' },
              { question: 'Do you need alternative solutions?', answer: 'Show both optimal and alternative approaches.' }
            ],
            edgeCases: [
              { case: 'Input validation', explanation: 'Check for valid input parameters.' },
              { case: 'Boundary conditions', explanation: 'Handle edge cases appropriately.' },
              { case: 'Performance considerations', explanation: 'Optimize for time and space complexity.' }
            ],
            optimalSolution: result.message || '// Solution will be provided based on the detected problem',
            bruteForceSolution: '// Alternative approach will be shown here',
            language: 'auto-detected'
          };
          setResponse(codingResponse);
          
          // Add to context
          addToContext({
            id: entryId,
            timestamp: Date.now(),
            type: isFollowUp ? 'follow-up' : 'initial',
            screenshots: currentScreenshots,
            prompt: text,
            mode,
            response: codingResponse,
            apiProvider
          });
        } else {
          setResponse(result.message);
          
          // Add to context
          addToContext({
            id: entryId,
            timestamp: Date.now(),
            type: isFollowUp ? 'follow-up' : 'initial',
            screenshots: currentScreenshots,
            prompt: text,
            mode,
            response: result.message,
            apiProvider
          });
        }
      } else {
        if (!text.trim()) return;
          // Use contextual prompt for follow-ups
        const promptToUse = isFollowUp ? contextualPrompt : text;
        console.log('Text-only request. IsFollowUp:', isFollowUp);
        if (isFollowUp) {
          console.log('Follow-up prompt for text-only:', promptToUse.substring(0, 200) + '...');
        }
        result = await ApiManager.fetchData(apiProvider, apiKey, promptToUse, mode);
        
        if (mode === 'Coding') {
          const codingResponse: CodingModeResponse = {
            problemTitle: isFollowUp ? `Follow-up: ${text}` : 'Sample Problem: Two Sum',
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
            optimalSolution: `# Optimal Solution\ndef two_sum(nums, target):\n    # Create a dictionary to store previously seen numbers and their indices\n    lookup = {}\n    for i, num in enumerate(nums):\n        # Check if the complement (target - num) exists in the dictionary\n        if target - num in lookup:\n            # If found, return the indices of the two numbers\n            return [lookup[target - num], i]\n        # Store the current number and its index in the dictionary\n        lookup[num] = i\n\n# This approach is efficient (O(n) time) because it only requires a single pass through the list.\n# Space Complexity: O(n)\n# Time Complexity: O(n)`,
            bruteForceSolution: `# Brute-force Solution\ndef two_sum(nums, target):\n    # Check every possible pair of numbers\n    for i in range(len(nums)):\n        for j in range(i+1, len(nums)):\n            # If the pair sums to the target, return their indices\n            if nums[i] + nums[j] == target:\n                return [i, j]\n\n# This approach is simple but inefficient (O(n^2) time) because it checks all pairs.\n# Space Complexity: O(1)\n# Time Complexity: O(n^2)`,
            language: 'python'
          };
          setResponse(codingResponse);
          
          // Add to context
          addToContext({
            id: entryId,
            timestamp: Date.now(),
            type: isFollowUp ? 'follow-up' : 'initial',
            screenshots: [],
            prompt: text,
            mode,
            response: codingResponse,
            apiProvider
          });
        } else {
          setResponse(result.message);
          
          // Add to context
          addToContext({
            id: entryId,
            timestamp: Date.now(),
            type: isFollowUp ? 'follow-up' : 'initial',
            screenshots: [],
            prompt: text,
            mode,
            response: result.message,
            apiProvider
          });
        }
      }
      setStatus('Ready');
      setQuery('');
    } catch {
      setResponse('An error occurred during fetch.');
      setStatus('Error');
    } finally {
      setIsThinking(false);
    }
  }, [apiKey, apiProvider, mode, screenshots, getAutoPromptForMode, isFollowUpQuestion, buildContextualPrompt, generateContextId, getRecentContext, addToContext]);

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
    localStorage.setItem('language', language);
    setShowSettings(false);
    setStatus(apiKey ? 'Ready' : 'Not Set');
  };
  useEffect(() => {
    const savedProvider = localStorage.getItem('apiProvider') as ApiProvider;
    const savedApiKey = localStorage.getItem('apiKey');
    const savedLanguage = localStorage.getItem('language');
    if (savedProvider) {
      setApiProvider(savedProvider);
    }
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
    if (savedLanguage) {
      setLanguage(savedLanguage);
    }
    setStatus(savedApiKey ? 'Ready' : 'Not Set');
  }, []);
  useEffect(() => {
    const width = 400;
    const height = showSettings ? 600 : 350;
    window.electron.ipcRenderer.send('resize-window', { width, height });
  }, [showSettings]);

  // Cleanup effect for voice recording
  useEffect(() => {
    return () => {
      if (isListening) {
        mediaRecorder?.stop();
        stopRecording();
      }
    };
  }, [isListening, mediaRecorder]);  const toggleListen = async () => {
    console.log('🎯 Voice button clicked! Current state:', isListening);
    
    if (isListening) {
      // Stop recording
      try {
        console.log('🛑 Stopping recording...');
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
        stopRecording();
        setIsListening(false);
        setStatus('Ready');
        console.log('✅ Recording stopped successfully');
      } catch (error) {
        console.error('❌ Error stopping recording:', error);
        setStatus('Error stopping');
        setIsListening(false);
      }
    } else {
      // Start recording
      let stream: MediaStream;
      try {
        console.log('🎤 Starting recording process...');
        
        // First check if we have navigator.mediaDevices
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Media devices not supported in this browser');
        }
        
        // Check if microphones are available
        const hasMicrophone = await checkMicrophoneAccess();
        if (!hasMicrophone) {
          throw new Error('No microphone devices found');
        }
        
        setStatus('Getting microphone...');
        
        // Try different microphone configurations with fallbacks
        try {
          console.log('🔧 Trying optimized audio settings for accent recognition...');
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              sampleRate: 48000, // Increased for better quality and accent capture
              channelCount: 1,
              echoCancellation: true, // Keep echo cancellation for clarity
              noiseSuppression: false, // Turn off to capture natural speech patterns
              autoGainControl: true // Auto adjust for different speaking volumes
            }
          });
        } catch (firstError) {
          console.log('⚠️ Optimized settings failed, trying enhanced settings...', firstError);
          try {
            stream = await navigator.mediaDevices.getUserMedia({ 
              audio: {
                sampleRate: 44100, // Fallback to standard high quality
                echoCancellation: true,
                noiseSuppression: false, // Keep off for sensitivity to accented speech
                autoGainControl: true
              }
            });
          } catch (secondError) {
            console.log('⚠️ Enhanced settings failed, trying minimal settings...', secondError);
            stream = await navigator.mediaDevices.getUserMedia({ 
              audio: true
            });
          }
        }
        
        console.log('🎵 Got microphone access');
        setStatus('Connecting to Deepgram...');
          // Start Deepgram first and wait for it to be ready
        let deepgramReady = false;
          startRecording((transcript) => {
          console.log('🗣️ Got transcript:', transcript);
          if (transcript && transcript.trim()) {
            setQuery(transcript);
            setStatus('Got: ' + transcript.substring(0, 30) + '...');
            setTimeout(() => {
              handleSubmit(transcript);
            }, 500);
          }
        }, language);
        
        // Wait for Deepgram connection with timeout
        console.log('⏳ Waiting for Deepgram to connect...');
        for (let i = 0; i < 10; i++) {
          await new Promise(resolve => setTimeout(resolve, 500));          // Check if connected (we'll need to export this)
          if (getSocketState() === WebSocket.OPEN) {
            deepgramReady = true;
            console.log('✅ Deepgram is ready!');
            break;
          }
        }
        
        if (!deepgramReady) {
          throw new Error('Deepgram connection timeout');
        }        // Start MediaRecorder with optimal settings for sensitivity
        const recorder = new MediaRecorder(stream);
        console.log('🎙️ Using optimized MediaRecorder for sensitivity');
          recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            console.log('📼 Sending audio chunk:', e.data.size, 'bytes, type:', e.data.type);            console.log('📼 Audio blob details:', {
              size: e.data.size,
              type: e.data.type
            });
            sendAudio(e.data);
          } else {
            console.log('⚠️ Empty audio chunk received');
          }
        };
        
        recorder.onstart = () => console.log('▶️ Recorder started');        recorder.onstop = () => {
          console.log('⏹️ Recorder stopped');
          stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        };
          recorder.start(250); // Smaller chunks (250ms) for faster response and better sensitivity
        setMediaRecorder(recorder);
        setIsListening(true);
        setStatus('🎤 Listening... (speak normally)');
        
        console.log('✅ Recording started with enhanced sensitivity');
          } catch (error) {
        console.error('❌ Error starting recording:', error);
        
        // Provide specific error messages
        let errorMessage = 'Microphone error';
        if (error instanceof Error) {
          if (error.message.includes('Permission denied')) {
            errorMessage = 'Microphone permission denied';
          } else if (error.message.includes('not found')) {
            errorMessage = 'No microphone found';
          } else if (error.message.includes('not supported')) {
            errorMessage = 'Browser not supported';
          } else if (error.message.includes('Deepgram')) {
            errorMessage = 'Deepgram connection failed';
          } else {
            errorMessage = `Error: ${error.message}`;
          }
        }
        
        setStatus(errorMessage);
        setIsListening(false);
      }
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

  // Helper function to check microphone availability
  const checkMicrophoneAccess = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      console.log('🎤 Available audio inputs:', audioInputs.length);
      
      if (audioInputs.length === 0) {
        console.warn('⚠️ No audio input devices found');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error checking microphone access:', error);
      return false;
    }
  };
  return (
    <Body>
      <Card
        className={`w-full h-full flex flex-col ${getModeColor()}`}
        style={{ imageRendering: 'pixelated', padding: '12px', boxSizing: 'border-box' }}
      >        {/* Draggable Title Bar */}        <div
          className="grid grid-cols-3 items-center bg-gray-700 py-1 text-xl font-bold cursor-move"
          style={{ WebkitAppRegion: 'drag', padding: '8px' } as React.CSSProperties}
        >
          <div />
          <span className="title-text whitespace-nowrap" style={{ fontSize: '1.5rem', marginLeft: '-30px' }}>AIutino ({mode} Mode)</span>
          <button
            onClick={() => window.electron.ipcRenderer.send('close-app')}
            className="justify-self-end h-full px-4 flex items-center text-white bg-red-500 hover:bg-red-700"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            X
          </button>
        </div>        {/* Response Area */}
        <div className="flex-grow bg-gray-900 overflow-y-auto text-sm relative" style={{ padding: '8px' }}>
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
            <div className={isThinking ? 'animate-pulse' : ''}>              {typeof response === 'string' && (
                <div className="whitespace-pre-wrap">
                  {response}
                </div>
              )}
            </div>          )}
          
          {response && response !== '...' && !isThinking && (
            <Button
              onClick={handleCopy}
              className="absolute top-2 right-2 px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500"
            >
              Copy
            </Button>
          )}
        </div>        {/* Input Area */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(query);
          }}
          className="bg-gray-700"
          style={{ padding: '8px' }}
        >
          <div className="space-y-2">            <Textarea
              value={query}
              onChange={handleQueryChange}
              placeholder={
                conversationContext.length > 0 
                  ? "Ask a follow-up question..." 
                  : "Ask me anything"
              }
              className="w-full"
              disabled={isThinking}
              rows={mode === 'Summarization' ? 6 : 3}
            />{mode !== 'Normal' && (
              <div className="text-xs text-gray-400 flex items-center space-x-1">
                <span>Auto-capture mode: {getAutoPromptForMode(mode).substring(0, 60)}...</span>
              </div>
            )}
          </div>
        </form>        {/* Controls */}
        <div className="flex items-center justify-between bg-gray-800" style={{ padding: '8px' }}>
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

          <div className="flex items-center space-x-2">            <Button
              onClick={handleCapture}
              className="px-2 py-1 text-xs bg-purple-500"
              disabled={isThinking || screenshots.length >= maxScreenshots}
              title={`Auto-analyze screenshot in ${mode} mode`}
            >
              Capture ({screenshots.length + 1}/{maxScreenshots})
            </Button>
            <Button
              onClick={() => handleSubmit(query)}
              className="px-2 py-1 text-xs bg-green-500"
              disabled={isThinking}
            >
              Submit
            </Button>            <Button
              onClick={toggleListen}
              className={`px-2 py-1 text-xs ${
                isListening 
                  ? 'bg-red-500 animate-pulse border-red-300' 
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
              disabled={isThinking}
              title={isListening ? 'Click to stop listening' : 'Click to start voice input'}            >
              {isListening ? 'Stop' : 'Voice'}
            </Button><Button
              onClick={() => {
                setResponse('Welcome to AIutino! Enter a prompt to get started.');
                setScreenshots([]);
                setQuery('');
                setStatus('Ready');
                setShowSettings(false);
                setConversationContext([]);
                window.electron.ipcRenderer.send('reload-app');
              }}
              className="px-2 py-1 text-xs bg-gray-500 hover:bg-blue-400 text-white"
              title="Reload App & Clear Context"
            >
              Reload
            </Button>
          </div>
        </div>        {/* Status Bar */}
        <div className="bg-gray-600 text-xs text-center flex justify-between" style={{ padding: '8px' }}>
          <span className={isListening ? 'text-red-400 animate-pulse' : ''}>
            Status: {status} {isListening && '🎤'}
          </span>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-xs hover:underline"
          >
            Settings
          </button>
        </div>

        {showSettings && (
          <div className="pt-4">
            <Card className="w-[380px]">              <div
                className="grid grid-cols-3 items-center bg-gray-700 text-sm font-bold cursor-move"
                style={{ WebkitAppRegion: 'drag', padding: '8px' } as React.CSSProperties}
              >
                <div />
                <span className="text-center">Settings</span>
                <button
                  onClick={() => setShowSettings(false)}
                  className="justify-self-end h-full px-4 flex items-center text-white bg-red-500 hover:bg-red-700"
                  style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                >
                  X
                </button>              </div>              <div className="space-y-4">                <div style={{ padding: '8px' }}>
                  <RadioGroup
                    label="API Provider"
                    options={['OpenAI', 'Google', 'Anthropic']}
                    selectedValue={apiProvider}
                    onChange={(value) => setApiProvider(value as ApiProvider)}
                  />
                </div>
                
                <div style={{ padding: '8px' }}>
                  <Input
                    label={`Enter ${apiProvider} API Key`}
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                  />
                </div>
                
                <div className="space-y-2" style={{ padding: '8px' }}>
                  <label className="text-sm font-medium text-gray-200">
                    Language/Accent (for voice recognition)
                  </label>
                  <Select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full"
                  >
                    <option value="en">English (General - Best for accents)</option>
                    <option value="en-US">English (US)</option>
                    <option value="en-GB">English (UK)</option>
                    <option value="en-AU">English (Australian)</option>
                    <option value="en-IN">English (Indian)</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="it">Italian</option>
                    <option value="pt">Portuguese</option>
                    <option value="nl">Dutch</option>
                    <option value="pl">Polish</option>
                    <option value="ru">Russian</option>
                    <option value="ja">Japanese</option>
                    <option value="ko">Korean</option>
                    <option value="zh">Chinese</option>
                  </Select>
                </div>
                
                <div className="flex justify-end space-x-2 pt-2" style={{ padding: '8px' }}>
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
