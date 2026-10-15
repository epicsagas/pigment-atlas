// Living Architecture: curved sail-like facades (WDCH-inspired forms) with projection-mapped data stripes.
import * as THREE from 'three/webgpu';
import { uniform, fract, smoothstep, mix, color, mx_noise_float, vec3 } from 'three/tsl';
import { attr, makePoints, disposeScene } from '../lib/points.js';

export const meta = {
	title: { ko: '살아있는 건축', en: 'Living Architecture' },
	ref: { ko: 'WDCH Dreams, Casa Batlló: 건물의 실제 곡면에 맞춰 흐르는 데이터 투사', en: 'WDCH Dreams, Casa Batlló: data projections that follow a building\'s real curves' }
};
export const cameraPosition = [ 1, 0.3, 3.6 ];

const SAILS = 7, U = 160, V = 140;
const COUNT = SAILS * U * V;

export function create() {

	const scene = new THREE.Scene();
	const pos = new Float32Array( COUNT * 3 );
	const uv2 = new Float32Array( COUNT * 3 ); // u, v, sail
	const p = new THREE.Vector3(), axis = new THREE.Vector3( 0, 1, 0 );

	for ( let i = 0; i < COUNT; i ++ ) {

		const u = ( i % U ) / ( U - 1 ), v = Math.floor( i / U ) % V / ( V - 1 ), s = Math.floor( i / ( U * V ) );
		const w = 1.6 + s * 0.15, h = 1.2 + Math.sin( s * 1.7 ) * 0.5;
		// Curved sail: bulges outward and leans back as it rises.
		p.set( ( u - 0.5 ) * w, v * h * ( 1 - 0.3 * Math.abs( u - 0.5 ) ) - 1, Math.sin( u * Math.PI ) * 0.45 - v * v * 0.5 );
		p.applyAxisAngle( axis, s * 0.9 - 2.4 ).add( new THREE.Vector3( Math.cos( s * 1.3 ) * 0.9, 0, Math.sin( s * 1.1 ) * 0.7 ) );
		pos.set( [ p.x, p.y, p.z ], i * 3 );
		uv2.set( [ u, v, s ], i * 3 );

	}

	const uTime = uniform( 0 );
	const q = attr( uv2 );
	const stripe = fract( q.x.mul( 12 ).add( q.y.mul( 3 ) ).sub( uTime.mul( 0.4 ) ).add( q.z.mul( 0.37 ) ) );
	const line = smoothstep( 0, 0.08, stripe ).mul( smoothstep( 0.3, 0.08, stripe ) );
	const wash = mx_noise_float( vec3( q.x.mul( 3 ), q.y.mul( 3 ).sub( uTime.mul( 0.2 ) ), q.z ) ).mul( 0.5 ).add( 0.5 );
	const tint = mix( color( 0x1a1f3a ), mix( color( 0x3fd0ff ), color( 0xff9b5e ), wash ), line.max( wash.pow( 3 ) ) );

	scene.add( makePoints( COUNT, { position: attr( pos ), color: tint, alpha: 0.4, size: 0.011 } ) );

	return {
		scene,
		update( delta, elapsed ) {

			uTime.value = elapsed;

		},
		dispose: () => disposeScene( scene )
	};

}
