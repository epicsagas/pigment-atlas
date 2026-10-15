// Infinity Room: every surface of a cube becomes a projection-mapped, endlessly receding grid.
import * as THREE from 'three/webgpu';
import { uniform, uv, fract, max, smoothstep, sin, length, positionWorld, mx_noise_float, mix, color, vec3 } from 'three/tsl';
import { disposeScene } from '../lib/points.js';

export const meta = {
	title: { ko: '무한의 방', en: 'Infinity Room' },
	ref: { ko: 'Infinity Room (2015): 거울 대신 프로젝션 매핑으로 방의 모든 면을 무한 공간으로', en: 'Infinity Room (2015): projection mapping, not mirrors, turns every surface into infinite space' }
};
export const cameraPosition = [ 0, 0, 0.6 ];

export function create() {

	const scene = new THREE.Scene();
	const uTime = uniform( 0 );

	const g = uv().mul( 24 );
	const grid = max( smoothstep( 0.94, 1, fract( g.x ) ), smoothstep( 0.94, 1, fract( g.y ) ) );
	const pulse = sin( length( positionWorld ).mul( 4 ).sub( uTime.mul( 1.6 ) ) ).mul( 0.5 ).add( 0.5 );
	const cloud = mx_noise_float( positionWorld.mul( 0.45 ).add( vec3( 0, uTime.mul( 0.08 ), 0 ) ) ).mul( 0.5 ).add( 0.5 );

	const material = new THREE.MeshBasicNodeMaterial( { side: THREE.BackSide } );
	material.colorNode = mix( color( 0x02040c ), color( 0x19c6d8 ), grid.mul( pulse ) )
		.add( color( 0x6a2cc0 ).mul( cloud.pow( 4 ) ).mul( 0.9 ) );

	scene.add( new THREE.Mesh( new THREE.BoxGeometry( 6, 6, 6 ), material ) );

	return {
		scene,
		update( delta, elapsed ) {

			uTime.value = elapsed;

		},
		dispose: () => disposeScene( scene )
	};

}
