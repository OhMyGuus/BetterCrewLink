import { useEffect, useSyncExternalStore } from 'react';
import { VoiceController } from './VoiceController';
import { VoiceSnapshot } from './types';

export const voiceController = new VoiceController();

/**
 * Read-only access to the voice engine. Does not start it.
 */
export function useVoiceSnapshot(): VoiceSnapshot {
	return useSyncExternalStore(voiceController.subscribe, voiceController.getSnapshot);
}

/**
 * Starts the voice engine for as long as the calling component is mounted.
 */
export function useVoiceEngine(): { voice: VoiceSnapshot; controller: VoiceController } {
	useEffect(() => {
		void voiceController.start();
		return () => voiceController.stop();
	}, []);

	return { voice: useVoiceSnapshot(), controller: voiceController };
}
