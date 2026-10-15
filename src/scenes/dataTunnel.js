// Data Tunnel: first-person flight through a stream of archive points (Living Architecture: Gehry, ch. III).
import * as THREE from 'three/webgpu';
import { uniform, vec3, mod, smoothstep } from 'three/tsl';
import { attr, makePoints, disposeScene } from '../lib/points.js';

export const meta = {
	title: { ko: '데이터 터널', en: 'Data Tunnel' },
	ref: { ko: 'Living Architecture: Gehry 3장: 잠재 공간을 관통하는 1인칭 비행', en: 'Living Architecture: Gehry, ch. III: a first-person flight through latent space' }
};
export const cameraPosition = [ 0, 0, 2.5 ];

const COUNT = 120_000;
const LENGTH = 32;

export function create() {

	const scene = new THREE.Scene();
	const base = new Float32Array( COUNT * 3 );
	const tint = new Float32Array( COUNT * 3 );
	const c = new THREE.Color();

	for ( let i = 0; i < COUNT; i ++ ) {

		const a = Math.random() * Math.PI * 2;
		const r = 1.1 + Math.pow( Math.random(), 3 ) * 1.4;
		base.set( [ Math.cos( a ) * r, Math.sin( a ) * r, Math.random() * LENGTH ], i * 3 );
		c.setHSL( 0.52 + 0.25 * Math.sin( a * 3 ), 0.85, 0.5 + Math.random() * 0.2 );
		tint.set( [ c.r, c.g, c.b ], i * 3 );

	}

	const uTime = uniform( 0 );
	const p = attr( base );
	const z = mod( p.z.add( uTime.mul( 4 ) ), LENGTH ).sub( LENGTH - 2.5 );
	const near = smoothstep( - LENGTH + 2.5, - 6, z ); // fade in from the far end

	scene.add( makePoints( COUNT, { position: vec3( p.x, p.y, z ), color: attr( tint ).mul( near ), alpha: 0.5, size: 0.016 } ) );

	return {
		scene,
		update( delta, elapsed ) {

			uTime.value = elapsed;
			scene.rotation.z = elapsed * 0.05;

		},
		dispose: () => disposeScene( scene )
	};

}
