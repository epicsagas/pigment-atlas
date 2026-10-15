// P1 Data Pigment: GPU particles advected through a curl-noise field plus a "wind" vector.
// Study of Wind of Boston / Unsupervised Fluid Dreams, not a reproduction.
import * as THREE from 'three/webgpu';
import { Fn, If, instancedArray, instanceIndex, uniform, vec3, vec4, hash, mix, smoothstep, length, color, uv } from 'three/tsl';
import { curl } from '../tsl/curl.js';

export const meta = {
	title: { ko: '데이터 안료', en: 'Data Pigment' },
	ref: { ko: 'Wind of Boston, Unsupervised Fluid Dreams: 커얼 노이즈 유체에 실려 흐르는 26만 입자', en: 'Wind of Boston, Unsupervised Fluid Dreams: 262k particles carried by a curl-noise fluid' }
};
export const cameraPosition = [ 0, 0, 5.2 ];

const COUNT = 1 << 18;
const HALF = new THREE.Vector3( 2.4, 1.35, 0.6 ); // 16:9 "data sculpture" box

export function create( renderer ) {

	const scene = new THREE.Scene();

	const position = instancedArray( COUNT, 'vec3' );
	const velocity = instancedArray( COUNT, 'vec3' );
	const life = instancedArray( COUNT, 'float' );

	const uTime = uniform( 0 );
	const uDelta = uniform( 0 );
	const uWind = uniform( new THREE.Vector3( 0.35, 0.05, 0 ) );

	const randomInBox = ( seed ) => vec3(
		hash( instanceIndex.add( seed ) ),
		hash( instanceIndex.add( seed ).add( 1e6 ) ),
		hash( instanceIndex.add( seed ).add( 2e6 ) )
	).sub( 0.5 ).mul( vec3( HALF ).mul( 2 ) );

	const respawn = ( seed ) => {

		position.element( instanceIndex ).assign( randomInBox( seed ) );
		velocity.element( instanceIndex ).assign( vec3( 0 ) );
		life.element( instanceIndex ).assign( hash( instanceIndex.add( seed ).add( 3e6 ) ).mul( 4 ).add( 2 ) );

	};

	renderer.compute( Fn( () => respawn( 0 ) )().compute( COUNT ) );

	const update = Fn( () => {

		const p = position.element( instanceIndex );
		const v = velocity.element( instanceIndex );
		const l = life.element( instanceIndex );

		const flow = curl( p.mul( 0.55 ).add( vec3( 0, 0, uTime.mul( 0.07 ) ) ) ).mul( 0.35 ).add( uWind );
		v.assign( mix( v, flow, 0.06 ) );
		p.addAssign( v.mul( uDelta ) );
		l.subAssign( uDelta );

		const outside = p.x.abs().greaterThan( HALF.x )
			.or( p.y.abs().greaterThan( HALF.y ) )
			.or( p.z.abs().greaterThan( HALF.z ) );

		If( l.lessThan( 0 ).or( outside ), () => respawn( uTime.mul( 997 ).toUint() ) );

	} )().compute( COUNT );

	// Speed becomes pigment: abyss blue, cyan, incandescent white.
	const speed = length( velocity.toAttribute() );
	const pigment = mix(
		mix( color( 0x0a1f6b ), color( 0x19c6d8 ), smoothstep( 0.1, 0.45, speed ) ),
		color( 0xfff2d6 ), smoothstep( 0.45, 0.9, speed )
	);
	const fade = smoothstep( 0, 0.6, life.toAttribute() );
	const disc = smoothstep( 0.5, 0.1, length( uv().sub( 0.5 ) ) );

	const material = new THREE.SpriteNodeMaterial( { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending } );
	material.positionNode = position.toAttribute();
	material.colorNode = vec4( pigment, disc.mul( fade ).mul( 0.32 ) );
	material.scaleNode = uniform( 0.011 );

	const particles = new THREE.Sprite( material );
	particles.count = COUNT;
	particles.frustumCulled = false;
	scene.add( particles );

	const frame = new THREE.LineSegments(
		new THREE.EdgesGeometry( new THREE.BoxGeometry( HALF.x * 2, HALF.y * 2, HALF.z * 2 ) ),
		new THREE.LineBasicNodeMaterial( { color: 0x2a3550 } )
	);
	scene.add( frame );

	return {
		scene,
		update( delta, elapsed ) {

			uTime.value = elapsed;
			uDelta.value = Math.min( delta, 1 / 30 );
			// Slowly veering wind, stand-in for a real sensor feed (plan P6).
			uWind.value.set( 0.35 * Math.cos( elapsed * 0.05 ), 0.12 * Math.sin( elapsed * 0.11 ), 0 );
			renderer.compute( update );

		},
		dispose() {

			material.dispose();
			frame.geometry.dispose();
			frame.material.dispose();

		}
	};

}
