// Sphere: a programmable LED shell where data pigments flow across the surface (Machine Hallucinations: Sphere).
import * as THREE from 'three/webgpu';
import { uniform, mix, color, smoothstep, normalize, mx_fractal_noise_float } from 'three/tsl';
import { attr, makePoints, disposeScene } from '../lib/points.js';

export const meta = {
	title: { ko: '스피어', en: 'Sphere' },
	ref: { ko: 'Machine Hallucinations: Sphere (2023): 58만 제곱피트 LED 외피 위를 흐르는 데이터', en: 'Machine Hallucinations: Sphere (2023): data flowing over a 580,000 sq ft LED shell' }
};
export const cameraPosition = [ 0, - 1.2, 6.5 ];

const COUNT = 200_000;

export function create() {

	const scene = new THREE.Scene();
	const shell = new Float32Array( COUNT * 3 );
	for ( let i = 0; i < COUNT; i ++ ) {

		const y = 1 - 2 * ( i + 0.5 ) / COUNT, r = Math.sqrt( 1 - y * y ), a = i * 2.39996;
		shell.set( [ Math.cos( a ) * r * 2, y * 2, Math.sin( a ) * r * 2 ], i * 3 );

	}

	const uTime = uniform( 0 );
	const p = attr( shell );
	const n = mx_fractal_noise_float( p.mul( 0.7 ).add( uTime.mul( 0.12 ) ), 4 ).mul( 0.5 ).add( 0.5 );
	const tint = mix( mix( color( 0x081040 ), color( 0x2f7bff ), smoothstep( 0.2, 0.5, n ) ), color( 0xffd27a ), smoothstep( 0.55, 0.8, n ) );

	// Bright regions bulge outward slightly, like pigment welling up.
	scene.add( makePoints( COUNT, { position: p.add( normalize( p ).mul( n.mul( 0.12 ) ) ), color: tint, alpha: 0.5, size: 0.016 } ) );

	return {
		scene,
		update( delta, elapsed ) {

			uTime.value = elapsed;
			scene.rotation.y = elapsed * 0.03;

		},
		dispose: () => disposeScene( scene )
	};

}
