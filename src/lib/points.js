// Shared bits for the particle scenes: GPU-resident attributes and additive soft sprites.
import * as THREE from 'three/webgpu';
import { instancedArray, uniform, vec4, smoothstep, length, uv } from 'three/tsl';

export const attr = ( array, type = 'vec3' ) => instancedArray( array, type ).toAttribute();

export function makePoints( count, { position, color, alpha = 0.35, size = 0.012 } ) {

	const material = new THREE.SpriteNodeMaterial( { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending } );
	material.positionNode = position;
	material.colorNode = vec4( color, smoothstep( 0.5, 0.1, length( uv().sub( 0.5 ) ) ).mul( alpha ) );
	material.scaleNode = uniform( size );

	const points = new THREE.Sprite( material );
	points.count = count;
	points.frustumCulled = false;
	return points;

}

export const gauss = () => Math.sqrt( - 2 * Math.log( 1 - Math.random() ) ) * Math.cos( 2 * Math.PI * Math.random() );

// Scene contract helper: dispose every material under the scene root.
export function disposeScene( scene ) {

	scene.traverse( ( o ) => {

		o.material?.dispose();
		if ( ! o.isSprite ) o.geometry?.dispose();

	} );

}
