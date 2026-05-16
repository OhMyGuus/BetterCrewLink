export interface VoiceEffectNodes {
	filter: BiquadFilterNode;
	dryGain: GainNode;
	wetGain: GainNode;
}

export interface VoiceDisguiseEffect {
	input: GainNode;
	output: GainNode;
	dryGain: GainNode;
	filter: BiquadFilterNode;
	pitchDelayA: DelayNode;
	pitchDelayB: DelayNode;
	delayModA: AudioBufferSourceNode;
	delayModB: AudioBufferSourceNode;
	fadeModA: AudioBufferSourceNode;
	fadeModB: AudioBufferSourceNode;
	pitchGainA: GainNode;
	pitchGainB: GainNode;
	reverb?: ConvolverNode;
	wetGain: GainNode;
}

const clampStrength = (strength: number) => Math.min(100, Math.max(0, Number.isFinite(strength) ? strength : 0));

export function updateVoiceEffectStrength(nodes: VoiceEffectNodes, strength: number) {
	const normalizedStrength = clampStrength(strength) / 100;

	configureVoiceEffectFilter(nodes.filter, strength);
	nodes.dryGain.gain.value = 1 - normalizedStrength * 0.9;
	nodes.wetGain.gain.value = normalizedStrength * 1.6;
}

export function configureVoiceEffectFilter(filter: BiquadFilterNode, strength: number) {
	const normalizedStrength = clampStrength(strength) / 100;

	filter.type = 'bandpass';
	filter.frequency.value = 1200 - normalizedStrength * 350;
	filter.Q.value = 1 + normalizedStrength * 8;
}

function createDelayTimeBuffer(context: AudioContext, delayTime: number, pitchUp: boolean) {
	const sampleRate = context.sampleRate;
	const buffer = context.createBuffer(1, Math.floor(delayTime * sampleRate), sampleRate);
	const data = buffer.getChannelData(0);

	for (let i = 0; i < data.length; i++) {
		const phase = i / data.length;
		data[i] = pitchUp ? delayTime * (1 - phase) : delayTime * phase;
	}

	return buffer;
}

function createFadeBuffer(context: AudioContext, delayTime: number, offset: number) {
	const sampleRate = context.sampleRate;
	const buffer = context.createBuffer(1, Math.floor(delayTime * sampleRate), sampleRate);
	const data = buffer.getChannelData(0);

	for (let i = 0; i < data.length; i++) {
		const phase = (i / data.length + offset) % 1;
		data[i] = Math.sin(Math.PI * phase);
	}

	return buffer;
}

function createLoopingBufferSource(context: AudioContext, buffer: AudioBuffer) {
	const source = context.createBufferSource();
	source.buffer = buffer;
	source.loop = true;
	source.start(0);
	return source;
}

export function createVoiceDisguiseEffect(
	context: AudioContext,
	reverbBuffer: AudioBuffer | null,
	strength: number
): VoiceDisguiseEffect {
	const input = context.createGain();
	const output = context.createGain();
	const dryGain = context.createGain();
	const filter = context.createBiquadFilter();
	const pitchDelayA = context.createDelay(0.12);
	const pitchDelayB = context.createDelay(0.12);
	const pitchGainA = context.createGain();
	const pitchGainB = context.createGain();
	const wetGain = context.createGain();
	const delayTime = 0.035;
	const delayBuffer = createDelayTimeBuffer(context, delayTime, true);
	const fadeBufferA = createFadeBuffer(context, delayTime, 0);
	const fadeBufferB = createFadeBuffer(context, delayTime, 0.5);
	const delayModA = createLoopingBufferSource(context, delayBuffer);
	const delayModB = createLoopingBufferSource(context, delayBuffer);
	const fadeModA = createLoopingBufferSource(context, fadeBufferA);
	const fadeModB = createLoopingBufferSource(context, fadeBufferB);

	delayModA.connect(pitchDelayA.delayTime);
	delayModB.connect(pitchDelayB.delayTime);
	fadeModA.connect(pitchGainA.gain);
	fadeModB.connect(pitchGainB.gain);

	input.connect(dryGain);
	dryGain.connect(output);
	input.connect(filter);
	filter.connect(pitchDelayA);
	filter.connect(pitchDelayB);
	pitchDelayA.connect(pitchGainA);
	pitchDelayB.connect(pitchGainB);
	pitchGainA.connect(wetGain);
	pitchGainB.connect(wetGain);

	let reverb: ConvolverNode | undefined;
	if (reverbBuffer) {
		reverb = context.createConvolver();
		reverb.buffer = reverbBuffer;
		wetGain.connect(reverb);
		reverb.connect(output);
	} else {
		wetGain.connect(output);
	}

	const effect = {
		input,
		output,
		dryGain,
		filter,
		pitchDelayA,
		pitchDelayB,
		delayModA,
		delayModB,
		fadeModA,
		fadeModB,
		pitchGainA,
		pitchGainB,
		reverb,
		wetGain,
	};
	updateVoiceDisguiseEffect(effect, strength);
	return effect;
}

export function updateVoiceDisguiseEffect(effect: VoiceDisguiseEffect, strength: number) {
	const normalizedStrength = clampStrength(strength) / 100;

	configureVoiceEffectFilter(effect.filter, strength);
	effect.dryGain.gain.value = 1 - normalizedStrength * 0.95;
	effect.wetGain.gain.value = normalizedStrength * 1.45;
}

export function disconnectVoiceDisguiseEffect(effect: VoiceDisguiseEffect) {
	effect.delayModA.stop();
	effect.delayModB.stop();
	effect.fadeModA.stop();
	effect.fadeModB.stop();
	effect.delayModA.disconnect();
	effect.delayModB.disconnect();
	effect.fadeModA.disconnect();
	effect.fadeModB.disconnect();
	effect.input.disconnect();
	effect.dryGain.disconnect();
	effect.filter.disconnect();
	effect.pitchDelayA.disconnect();
	effect.pitchDelayB.disconnect();
	effect.pitchGainA.disconnect();
	effect.pitchGainB.disconnect();
	effect.wetGain.disconnect();
	effect.reverb?.disconnect();
	effect.output.disconnect();
}

export function connectVoiceEffect(
	context: AudioContext,
	source: AudioNode,
	destination: AudioNode,
	strength: number
): VoiceEffectNodes {
	const filter = context.createBiquadFilter();
	const dryGain = context.createGain();
	const wetGain = context.createGain();

	source.connect(dryGain);
	dryGain.connect(destination);
	source.connect(filter);
	filter.connect(wetGain);
	wetGain.connect(destination);

	const nodes = { filter, dryGain, wetGain };
	updateVoiceEffectStrength(nodes, strength);
	return nodes;
}

export function disconnectVoiceEffect(nodes: VoiceEffectNodes) {
	nodes.filter.disconnect();
	nodes.dryGain.disconnect();
	nodes.wetGain.disconnect();
}
