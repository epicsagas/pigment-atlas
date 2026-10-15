// Quantum Memories: each point flickers between a smooth probability cloud and a measured, voxel-snapped state.
import * as THREE from 'three/webgpu';
import { uniform, floor, fract, step, mix, hash, instanceIndex, color, smoothstep, mx_noise_vec3 } from 'three/tsl';
import { attr, makePoints, gauss, disposeScene } from '../lib/points.js';

export const meta = {
	title: { ko: '양자 기억', en: 'Quantum Memories' },
	ref: { ko: 'Quantum Memories (2020, NGV): 양자 연산의 확률성으로 흔들리는 자연의 기억', en: 'Quantum Memories (2020, NGV): memories of nature shaken by quantum probability' }
};
export const cameraPosition = [ 0, 0, 5 ];

const COUNT = 150_000;

export function create() {

	const scene = new THREE.Scene();
	const cloud = new Float32Array( COUNT * 3 );
	for ( let i = 0; i < COUNT; i ++ ) {

		// Landscape-like cloud: wide, shallow, with a ridge.
		const x = gauss() * 1.2, z = gauss() * 0.8;
		cloud.set( [ x, Math.exp( - x * x ) * 0.8 * Math.cos( z * 2 ) + gauss() * 0.15 - 0.3, z ], i * 3 );

	}

	const uTime = uniform( 0 );
	const p = attr( cloud );
	const wave = p.add( mx_noise_vec3( p.mul( 0.9 ).add( uTime.mul( 0.1 ) ) ).mul( 0.25 ) );
	const voxel = floor( wave.mul( 10 ) ).add( 0.5 ).div( 10 );

	// Per-point measurement clock: collapsed for a random share of each cycle.
	const r = hash( instanceIndex );
	const measured = step( 0.62, fract( uTime.mul( r.mul( 0.3 ).add( 0.15 ) ).add( r ) ) );

	const tint = mix( mix( color( 0x0e6b5c ), color( 0x7cffb2 ), smoothstep( - 0.6, 0.6, wave.y ) ), color( 0xc9a6ff ), measured );

	scene.add( makePoints( COUNT, { position: mix( wave, voxel, measured ), color: tint, alpha: 0.35, size: 0.012 } ) );

	return {
		scene,
		update( delta, elapsed ) {

			uTime.value = elapsed;
			scene.rotation.y = elapsed * 0.05;

		},
		dispose: () => disposeScene( scene )
	};

}
