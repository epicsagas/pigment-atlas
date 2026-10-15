// Machine Dreams: Rainforest: swaying vines and canopy points with spores rising (Large Nature Model, DATALAND).
import * as THREE from 'three/webgpu';
import { uniform, vec3, sin, mix, color, smoothstep, fract, hash, instanceIndex, step } from 'three/tsl';
import { attr, makePoints, gauss, disposeScene } from '../lib/points.js';

export const meta = {
	title: { ko: '기계의 꿈: 열대우림', en: 'Machine Dreams: Rainforest' },
	ref: { ko: 'Large Nature Model, DATALAND 개관전 (2026): 열대우림 데이터로 꾸는 기계의 꿈', en: 'Large Nature Model, DATALAND opening show (2026): a machine dreaming in rainforest data' }
};
export const cameraPosition = [ 0, 0.2, 5 ];

const VINES = 260, PER_VINE = 500, SPORES = 30_000;
const COUNT = VINES * PER_VINE + SPORES;

export function create() {

	const scene = new THREE.Scene();
	const base = new Float32Array( COUNT * 3 ); // vine root x, height, z (or spore start)
	const kind = new Float32Array( COUNT * 3 ); // phase, isSpore, leafiness

	for ( let i = 0; i < COUNT; i ++ ) {

		if ( i < VINES * PER_VINE ) {

			const v = Math.floor( i / PER_VINE ), t = Math.random();
			const leaf = t > 0.55 && Math.random() < 0.6;
			const rx = ( ( v * 0.618 ) % 1 - 0.5 ) * 6 + ( leaf ? gauss() * 0.12 : 0 );
			const rz = ( ( v * 0.381 ) % 1 - 0.5 ) * 3 + ( leaf ? gauss() * 0.12 : 0 );
			base.set( [ rx, t * 3 - 1.6, rz ], i * 3 );
			kind.set( [ v * 1.7, 0, leaf ? 1 : 0 ], i * 3 );

		} else {

			base.set( [ ( Math.random() - 0.5 ) * 6, Math.random(), ( Math.random() - 0.5 ) * 3 ], i * 3 );
			kind.set( [ Math.random() * 10, 1, 0 ], i * 3 );

		}

	}

	const uTime = uniform( 0 );
	const b = attr( base ), k = attr( kind );
	const h = b.y.add( 1.6 ).div( 3 ); // 0 at root, 1 at canopy
	const sway = sin( uTime.mul( 0.7 ).add( k.x ).add( b.y.mul( 1.5 ) ) ).mul( h.mul( h ) ).mul( 0.25 );
	const vine = vec3( b.x.add( sway ), b.y, b.z.add( sway.mul( 0.4 ) ) );

	// Spores rise slowly and wrap around.
	const rise = fract( b.y.add( uTime.mul( 0.04 ).mul( hash( instanceIndex ).add( 0.5 ) ) ) );
	const spore = vec3( b.x.add( sin( uTime.mul( 0.5 ).add( k.x ) ).mul( 0.1 ) ), rise.mul( 3.4 ).sub( 1.7 ), b.z );

	const isSpore = step( 0.5, k.y );
	const green = mix( mix( color( 0x0b3d2a ), color( 0x2fd67b ), h ), color( 0xb8ff6a ), k.z.mul( 0.6 ) );
	const tint = mix( green, color( 0xffd36b ).mul( smoothstep( 0, 0.2, rise ).mul( smoothstep( 1, 0.7, rise ) ) ), isSpore );

	scene.add( makePoints( COUNT, { position: mix( vine, spore, isSpore ), color: tint, alpha: 0.4, size: 0.013 } ) );

	return {
		scene,
		update( delta, elapsed ) {

			uTime.value = elapsed;

		},
		dispose: () => disposeScene( scene )
	};

}
