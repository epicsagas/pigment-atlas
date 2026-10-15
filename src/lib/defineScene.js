// Declarative particle scene: one init() per point on the CPU, then position/color as TSL nodes on the GPU.
//
// spec = {
//   meta: { title: { ko, en }, ref: { ko, en } },
//   camera: [ x, y, z ],                 // default [ 0, 0, 5 ]
//   count,                               // number of points
//   init( i, count ) -> [ ax, ay, az, b0, b1, b2, b3 ]   // a: vec3, b: vec4 per point
//   position( ctx ) -> vec3 node,  color( ctx ) -> vec3 node
//   uniforms: { name: initialValue },    // exposed as ctx.u.name
//   update( ctx, t, dt ),                // optional per-frame JS hook
//   extras( ctx ),                       // optional: add meshes/lines to ctx.scene
//   size, alpha, spin                    // sprite size, additive alpha, y-rotation speed
// }
// ctx = { a, b, t, i, h, u, scene, points }  (h = per-point hash in [0, 1))
import * as THREE from 'three/webgpu';
import { uniform, hash, instanceIndex, mix, color, smoothstep } from 'three/tsl';
import { attr, makePoints, disposeScene } from './points.js';

export function defineScene( spec ) {

	const { meta, camera = [ 0, 0, 5 ], count, init, position, size = 0.012, alpha = 0.35, spin = 0 } = spec;

	return {
		meta,
		cameraPosition: camera,
		create() {

			const scene = new THREE.Scene();
			const A = new Float32Array( count * 3 ), B = new Float32Array( count * 4 );

			for ( let i = 0; i < count; i ++ ) {

				const v = init( i, count );
				A[ i * 3 ] = v[ 0 ]; A[ i * 3 + 1 ] = v[ 1 ]; A[ i * 3 + 2 ] = v[ 2 ];
				B[ i * 4 ] = v[ 3 ] ?? 0; B[ i * 4 + 1 ] = v[ 4 ] ?? 0; B[ i * 4 + 2 ] = v[ 5 ] ?? 0; B[ i * 4 + 3 ] = v[ 6 ] ?? 0;

			}

			const u = Object.fromEntries( Object.entries( spec.uniforms ?? {} ).map( ( [ k, v ] ) => [ k, uniform( v ) ] ) );
			const ctx = { a: attr( A ), b: attr( B, 'vec4' ), t: uniform( 0 ), i: instanceIndex, h: hash( instanceIndex ), u, scene };

			ctx.points = makePoints( count, { position: position( ctx ), color: spec.color( ctx ), alpha, size } );
			scene.add( ctx.points );
			spec.extras?.( ctx );

			return {
				scene,
				update( dt, t ) {

					ctx.t.value = t;
					ctx.points.rotation.y = t * spin;
					spec.update?.( ctx, t, dt );

				},
				dispose: () => disposeScene( scene )
			};

		}
	};

}

// Piecewise gradient over evenly spaced hex stops, x in [0, 1].
export const gradient = ( x, hexes ) => hexes.slice( 1 ).reduce(
	( acc, c, k ) => mix( acc, color( c ), smoothstep( k / ( hexes.length - 1 ), ( k + 1 ) / ( hexes.length - 1 ), x ) ),
	color( hexes[ 0 ] )
);

export const TAU = Math.PI * 2;
export const rand = ( lo = 0, hi = 1 ) => lo + Math.random() * ( hi - lo );

