// Melting Memories: eight synthetic EEG channels as ribbons that intermittently melt and drip.
import * as THREE from 'three/webgpu';
import { uniform, vec3, sin, mix, color, smoothstep, mx_noise_float, hash, instanceIndex } from 'three/tsl';
import { attr, makePoints, disposeScene } from '../lib/points.js';

export const meta = {
	title: { ko: '녹아내리는 기억', en: 'Melting Memories' },
	ref: { ko: 'Melting Memories (2018): EEG 데이터로 그린 기억의 형성과 퇴행', en: 'Melting Memories (2018): memory forming and decaying, drawn from EEG data' }
};
export const cameraPosition = [ 0, 0.3, 4.6 ];

const SAMPLES = 1024, CHANNELS = 8, LAYERS = 16;
const COUNT = SAMPLES * CHANNELS * LAYERS;

export function create() {

	const scene = new THREE.Scene();
	const grid = new Float32Array( COUNT * 3 ); // x in [-2.6, 2.6], channel, layer
	for ( let i = 0; i < COUNT; i ++ ) {

		const s = i % SAMPLES, c = Math.floor( i / SAMPLES ) % CHANNELS, l = Math.floor( i / ( SAMPLES * CHANNELS ) );
		grid.set( [ ( s / ( SAMPLES - 1 ) - 0.5 ) * 5.2, c, l / ( LAYERS - 1 ) ], i * 3 );

	}

	const uTime = uniform( 0 );
	const g = attr( grid );
	const x = g.x, ch = g.y, layer = g.z;

	// Delta, theta, alpha and beta bands, each channel phase-shifted.
	const t = uTime;
	const eeg = sin( x.mul( 1.3 ).add( t.mul( 0.4 ) ).add( ch ) ).mul( 0.09 )
		.add( sin( x.mul( 4.1 ).sub( t.mul( 1.1 ) ).add( ch.mul( 2.3 ) ) ).mul( 0.05 ) )
		.add( sin( x.mul( 10 ).add( t.mul( 2.7 ) ).add( ch.mul( 0.7 ) ) ).mul( 0.025 ) )
		.add( sin( x.mul( 23 ).sub( t.mul( 5.1 ) ) ).mul( 0.01 ) );

	// Regions of decay drift through the recording; points there drip downward.
	const decay = smoothstep( 0.25, 0.6, mx_noise_float( vec3( x.mul( 0.6 ), ch.mul( 0.4 ), t.mul( 0.12 ) ) ) );
	const drip = decay.mul( hash( instanceIndex ) ).mul( 1.4 );

	const y = ch.sub( ( CHANNELS - 1 ) / 2 ).mul( 0.32 ).add( eeg.mul( layer.mul( 0.6 ).add( 0.4 ) ) ).sub( drip );
	const tint = mix( mix( color( 0x5b5bff ), color( 0xff7ad9 ), ch.div( CHANNELS ) ), color( 0xffffff ), decay.mul( 0.6 ) );

	scene.add( makePoints( COUNT, { position: vec3( x, y, layer.sub( 0.5 ).mul( 0.5 ) ), color: tint, alpha: 0.28, size: 0.01 } ) );

	return {
		scene,
		update( delta, elapsed ) {

			uTime.value = elapsed;

		},
		dispose: () => disposeScene( scene )
	};

}
