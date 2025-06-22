import { createClient, LiveClient, LiveTranscriptionEvents } from '@deepgram/sdk';

const deepgram = createClient('f4fc780cf10c9d026d28f5b98d82e3e8915d42e4');

let connection: LiveClient;

export const startRecording = (onTranscript: (transcript: string) => void) => {
  connection = deepgram.listen.live({
    model: 'nova-2',
    smart_format: true,
  });

  connection.on(LiveTranscriptionEvents.Open, () => {
    console.log('Deepgram connection opened');

    connection.on(LiveTranscriptionEvents.Close, () => {
      console.log('Deepgram connection closed');
    });

    connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      onTranscript(data.channel.alternatives[0].transcript);
    });

    connection.on(LiveTranscriptionEvents.Error, (err) => {
      console.error(err);
    });
  });
};

export const stopRecording = () => {
  if (connection) {
    connection.finish();
  }
};

export const sendAudio = (audio: Blob) => {
  if (connection) {
    connection.send(audio);
  }
};
