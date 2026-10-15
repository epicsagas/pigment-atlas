// P3 Latent Walk: particles interpolate between shapes, dissolving into turbulence midway.
// Shape space stands in for a GAN latent space. Study of Machine Hallucinations.
import * as THREE from 'three/webgpu';
import { instancedArray, uniform, vec3, vec4, mix, smoothstep, length, uv, hash, instanceIndex } from 'three/tsl';
import { curl } from '../tsl/curl.js';

export const meta = {
	title: { ko: '잠재 산책', en: 'Latent Walk' },
	ref: { ko: 'Machine Hallucinations: 형상과 형상 사이에서 녹아내리는 기계의 환각', en: 'Machine Hallucinations: machine hallucinations melting between forms' }
};
export const cameraPosition = [ 0, 0, 5 ];

const COUNT = 1 << 17;
const HOLD = 0.35; // fraction of each step spent resting on a shape
const STEP_SECONDS = 7;

const SHAPES = [
	// Sphere (fibonacci lattice)
	( i, t ) => {

		const y = 1 - 2 * t, r = Math.sqrt( 1 - y * y ), a = i * 2.39996;
		return [ Math.cos( a ) * r * 1.4, y * 1.4, Math.sin( a ) * r * 1.4 ];

	},
	// Torus knot (2,3) with a fuzzy tube
	( i, t ) => {

		const a = t * Math.PI * 2, r = 0.9 + 0.35 * Math.cos( 3 * a ), s = 0.08 * Math.cos( i * 1.7 ), u = 0.08 * Math.sin( i * 1.3 );
		return [ r * Math.cos( 2 * a ) + s, 0.35 * Math.sin( 3 * a ) + u, r * Math.sin( 2 * a ) + s ];

	},
	// Standing wave sheet
	( i ) => {

		const x = ( i % 512 ) / 511 * 4 - 2, z = Math.floor( i / 512 ) / 255 * 3 - 1.5;
		return [ x, 0.3 * Math.sin( x * 3 ) * Math.cos( z * 4 ), z ];

	},
	// Spiral galaxy, three arms
	( i, t ) => {

		const arm = i % 3, rad = 0.1 + 2 * Math.sqrt( t ), a = arm * 2.094 + rad * 2.2 + ( Math.random() - 0.5 ) * 0.35;
		return [ Math.cos( a ) * rad, ( Math.random() - 0.5 ) * 0.12 * ( 2.2 - rad ), Math.sin( a ) * rad ];

	}
];

const PALETTE = [ 0x2fd5ff, 0xff4fa3, 0xffb547, 0x8a7bff ].map( ( c ) => new THREE.Color( c ) );

export function create() {

	const scene = new THREE.Scene();

	const targets = SHAPES.map( ( shape ) => {

		const arr = new Float32Array( COUNT * 3 );
		for ( let i = 0; i < COUNT; i ++ ) arr.set( shape( i, i / COUNT ), i * 3 );
		return instancedArray( arr, 'vec3' ).toAttribute();

	} );

	// One weight per shape; JS sets two neighbours to (1 - f, f).
	const weights = SHAPES.map( () => uniform( 0 ) );
	const uChaos = uniform( 0 );
	const uTime = uniform( 0 );
	const uTint = uniform( new THREE.Color() );

	const base = targets.reduce( ( acc, target, k ) => acc.add( target.mul( weights[ k ] ) ), vec3( 0 ) );
	const turbulence = curl( base.mul( 1.1 ).add( uTime.mul( 0.08 ) ) ).mul( uChaos.mul( 0.45 ) );
	const jitter = hash( instanceIndex ).mul( 0.6 ).add( 0.4 );

	const material = new THREE.SpriteNodeMaterial( { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending } );
	material.positionNode = base.add( turbulence );
	material.colorNode = vec4( mix( uTint, vec3( 1 ), uChaos.mul( 0.35 ) ).mul( jitter ), smoothstep( 0.5, 0.1, length( uv().sub( 0.5 ) ) ).mul( 0.35 ) );
	material.scaleNode = uniform( 0.014 );

	const points = new THREE.Sprite( material );
	points.count = COUNT;
	points.frustumCulled = false;
	scene.add( points );

	return {
		scene,
		update( delta, elapsed ) {

			const phase = elapsed / STEP_SECONDS;
			const cur = Math.floor( phase ) % SHAPES.length, next = ( cur + 1 ) % SHAPES.length;
			const f = THREE.MathUtils.smootherstep( phase % 1, HOLD, 1 );

			weights.forEach( ( w, k ) => w.value = k === cur ? 1 - f : k === next ? f : 0 );
			uChaos.value = Math.sin( Math.PI * f );
			uTime.value = elapsed;
			uTint.value.lerpColors( PALETTE[ cur ], PALETTE[ next ], f );
			points.rotation.y = elapsed * 0.06;

		},
		dispose() {

			material.dispose();

		}
	};

}
