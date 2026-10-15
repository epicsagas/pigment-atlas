// Coral Dreams: a branching "data sculpture" rotating 360 degrees (Machine Hallucinations: Coral Dreams).
import * as THREE from 'three/webgpu';
import { uniform, mix, color, smoothstep, length } from 'three/tsl';
import { attr, makePoints, gauss, disposeScene } from '../lib/points.js';
import { curl } from '../tsl/curl.js';

export const meta = {
	title: { ko: '산호의 꿈', en: 'Coral Dreams' },
	ref: { ko: 'Machine Hallucinations: Coral Dreams: 360도로 회전하는 AI 산호 데이터 조각', en: 'Machine Hallucinations: Coral Dreams: an AI coral data sculpture turning through 360 degrees' }
};
export const cameraPosition = [ 0, 0.4, 4.4 ];

const COUNT = 160_000;
const BRANCHES = 90;

// Random-walk branches that fork outward from a common base.
function growCoral() {

	const segments = [];
	const grow = ( start, dir, len, depth ) => {

		const end = start.clone().addScaledVector( dir, len );
		segments.push( [ start, end, depth ] );
		if ( depth > 3 || segments.length > BRANCHES * 4 ) return;
		for ( let k = 0; k < 2 + ( Math.random() < 0.4 ); k ++ ) {

			const d = dir.clone().add( new THREE.Vector3( gauss(), gauss() * 0.5, gauss() ).multiplyScalar( 0.5 ) ).normalize();
			grow( end, d, len * 0.72, depth + 1 );

		}

	};

	for ( let b = 0; b < 6; b ++ ) grow( new THREE.Vector3( gauss() * 0.15, - 1.3, gauss() * 0.15 ), new THREE.Vector3( gauss() * 0.4, 1, gauss() * 0.4 ).normalize(), 0.7, 0 );

	const pos = new Float32Array( COUNT * 3 );
	const depth = new Float32Array( COUNT );
	const p = new THREE.Vector3();
	for ( let i = 0; i < COUNT; i ++ ) {

		const [ a, b, d ] = segments[ Math.floor( Math.random() * segments.length ) ];
		const r = 0.06 * ( 1 - d / 5 );
		p.lerpVectors( a, b, Math.random() ).add( new THREE.Vector3( gauss(), gauss(), gauss() ).multiplyScalar( r ) );
		pos.set( [ p.x, p.y, p.z ], i * 3 );
		depth[ i ] = ( d + Math.random() ) / 5;

	}

	return { pos, depth };

}

export function create() {

	const scene = new THREE.Scene();
	const { pos, depth } = growCoral();
	const uTime = uniform( 0 );

	const p = attr( pos );
	const d = attr( depth, 'float' );
	const sway = curl( p.mul( 0.8 ).add( uTime.mul( 0.06 ) ) ).mul( d.mul( 0.08 ) );
	const tint = mix( mix( color( 0x3a0d4f ), color( 0xff5e7a ), smoothstep( 0, 0.6, d ) ), color( 0x7ff5e1 ), smoothstep( 0.7, 1, d ) );

	const coral = makePoints( COUNT, { position: p.add( sway ), color: tint.mul( smoothstep( 2.6, 0.2, length( p ) ).add( 0.3 ) ), alpha: 0.28, size: 0.011 } );
	scene.add( coral );

	return {
		scene,
		update( delta, elapsed ) {

			uTime.value = elapsed;
			coral.rotation.y = elapsed * 0.25;

		},
		dispose: () => disposeScene( scene )
	};

}
