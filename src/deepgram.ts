// Direct WebSocket implementation for Deepgram
let socket: WebSocket | null = null;
let isConnected = false;

const DEEPGRAM_API_KEY = 'bd763160f22d649fcb2f4ddb658f9f12cdc5fc28';

export const startRecording = (onTranscript: (transcript: string) => void, language: string = 'en') => {
  try {
    console.log('🚀 Starting Deepgram WebSocket connection...');
      // Optimized parameters for accented speech - simplified for better reliability
    const url = new URL('wss://api.deepgram.com/v1/listen');
    url.searchParams.append('model', 'nova-2');
    url.searchParams.append('language', language); // Use provided language for better accent support
    url.searchParams.append('interim_results', 'true'); // Get interim for faster response
    url.searchParams.append('smart_format', 'true'); // Better formatting
    url.searchParams.append('punctuate', 'true'); // Add punctuation
    url.searchParams.append('diarize', 'false'); // Single speaker for speed
    
    console.log('📡 Connecting to:', url.toString());
    
    socket = new WebSocket(url.toString(), ['token', DEEPGRAM_API_KEY]);
    
    socket.onopen = () => {
      console.log('✅ Deepgram WebSocket connected successfully');
      isConnected = true;
    };
    
    socket.onclose = (event) => {
      console.log('❌ Deepgram WebSocket closed:', event.code, event.reason);
      isConnected = false;
    };    socket.onerror = (error) => {
      console.error('💥 Deepgram WebSocket error:', error);
      isConnected = false;
    };
      socket.onmessage = (event) => {
      try {
        console.log('📝 Raw message received from Deepgram:', event.data);
        const data = JSON.parse(event.data);
        console.log('📋 Parsed data:', data);
          // Handle both interim and final results for better responsiveness
        if (data.channel && data.channel.alternatives && data.channel.alternatives[0]) {
          const transcript = data.channel.alternatives[0].transcript;
          const isFinal = data.is_final;
          
          if (transcript && transcript.trim()) {
            console.log(`✨ ${isFinal ? 'Final' : 'Interim'} transcript:`, transcript);
              // Process interim results more aggressively for better accent support
            // Lower word count threshold for interim to catch short phrases
            const wordCount = transcript.trim().split(/\s+/).length;
            if (isFinal || wordCount >= 2) { // Reduced from 3 to 2 words for faster response
              onTranscript(transcript);
            }
          } else {
            console.log('📝 Empty transcript received');
          }
        }else if (data.type === 'Metadata') {
          console.log('📊 Deepgram metadata:', data);
        } else if (data.type === 'Results') {
          console.log('📊 Deepgram results:', data);
        } else {
          console.log('📋 Other message type:', data.type, data);
        }
      } catch (parseError) {
        console.error('❌ Error parsing message:', parseError, 'Raw data:', event.data);
      }
    };
    
  } catch (error) {
    console.error('💥 Failed to start Deepgram connection:', error);
    throw error;
  }
};

export const stopRecording = () => {
  if (socket && isConnected) {
    try {
      console.log('🛑 Closing Deepgram connection...');
      socket.close();
      socket = null;
      isConnected = false;
    } catch (error) {
      console.error('❌ Error stopping recording:', error);
    }
  }
};

export const sendAudio = (audio: Blob) => {
  if (socket && isConnected && socket.readyState === WebSocket.OPEN) {
    try {
      console.log('📤 Sending audio to Deepgram, size:', audio.size, 'bytes');
      socket.send(audio);
    } catch (error) {
      console.error('❌ Error sending audio:', error);
    }
  } else {
    console.warn('⚠️ Cannot send audio: WebSocket not ready. State:', socket?.readyState);
  }
};

export const isDeepgramConnected = () => isConnected;

export const testDeepgramConnection = async (): Promise<boolean> => {
  try {
    console.log('🧪 Testing Deepgram API key...');
    const response = await fetch('https://api.deepgram.com/v1/projects', {
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      console.log('✅ Deepgram API key is valid');
      return true;
    } else {
      console.error('❌ Deepgram API key validation failed:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing Deepgram connection:', error);
    return false;
  }
};

// Test function to check WebSocket connection
export const testWebSocketConnection = (): Promise<boolean> => {
  return new Promise((resolve) => {
    console.log('🧪 Testing WebSocket connection...');
    
    const url = new URL('wss://api.deepgram.com/v1/listen');
    url.searchParams.append('model', 'nova-2');
    url.searchParams.append('language', 'en-US');
    
    const testSocket = new WebSocket(url.toString(), ['token', DEEPGRAM_API_KEY]);
    
    testSocket.onopen = () => {
      console.log('✅ Test WebSocket connected successfully');
      testSocket.close();
      resolve(true);
    };
    
    testSocket.onerror = (error) => {
      console.error('❌ Test WebSocket error:', error);
      resolve(false);
    };
    
    testSocket.onclose = (event) => {
      console.log('🔌 Test WebSocket closed:', event.code, event.reason);
    };
    
    // Timeout after 5 seconds
    setTimeout(() => {
      if (testSocket.readyState !== WebSocket.OPEN) {
        console.error('⏰ WebSocket connection timeout');
        testSocket.close();
        resolve(false);
      }
    }, 5000);
  });
};

export const getSocketState = () => socket?.readyState;
