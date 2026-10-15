// Wind Painting: flat canvas of particles following a 2D curl field plus drifting vortices.
// Study of Wind of Boston: Data Paintings and Living Paintings (California palette).
import * as THREE from 'three/webgpu';
import { Fn, If, instancedArray, instanceIndex, uniform, vec2, vec3, hash, mix, smoothstep, length, color, mx_noise_float } from 'three/tsl';
import { makePoints, disposeScene } from '../lib/points.js';

export const meta = {
	title: { ko: '바람 회화', en: 'Wind Painting' },
	ref: { ko: 'Wind of Boston, Living Paintings: 바람의 흐름을 붓질로 옮긴 6×13 비율의 데이터 회화', en: 'Wind of Boston, Living Paintings: wind turned into brushstrokes on a 6x13 data canvas' }
};
export const cameraPosition = [ 0, 0, 4.2 ];

const COUNT = 1 << 17;
const HALF = vec2( 2.8, 1.3 );
const E = 0.05;

export function create( renderer ) {

	const scene = new THREE.Scene();
	const position = instancedArray( COUNT, 'vec2' );
	const life = instancedArray( COUNT, 'float' );
	const speed = instancedArray( COUNT, 'float' );
	const uTime = uniform( 0 );
	const uDelta = uniform( 0 );

	// Stream function -> divergence-free 2D velocity.
	const psi = ( q ) => mx_noise_float( vec3( q.mul( 0.7 ), uTime.mul( 0.05 ) ) );
	const field = ( q ) => vec2(
		psi( q.add( vec2( 0, E ) ) ).sub( psi( q.sub( vec2( 0, E ) ) ) ),
		psi( q.sub( vec2( E, 0 ) ) ).sub( psi( q.add( vec2( E, 0 ) ) ) )
	).div( 2 * E ).mul( 0.25 ).add( vec2( 0.18, 0 ) );

	const respawn = ( seed ) => {

		position.element( instanceIndex ).assign( vec2( hash( instanceIndex.add( seed ) ), hash( instanceIndex.add( seed ).add( 1e6 ) ) ).sub( 0.5 ).mul( HALF.mul( 2 ) ) );
		life.element( instanceIndex ).assign( hash( instanceIndex.add( seed ).add( 2e6 ) ).mul( 5 ).add( 1 ) );

	};

	renderer.compute( Fn( () => respawn( 0 ) )().compute( COUNT ) );

	const update = Fn( () => {

		const p = position.element( instanceIndex );
		const l = life.element( instanceIndex );
		const v = field( p );
		p.addAssign( v.mul( uDelta ) );
		speed.element( instanceIndex ).assign( length( v ) );
		l.subAssign( uDelta );
		If( l.lessThan( 0 ).or( p.x.abs().greaterThan( HALF.x ) ).or( p.y.abs().greaterThan( HALF.y ) ), () => respawn( uTime.mul( 991 ).toUint() ) );

	} )().compute( COUNT );

	const s = speed.toAttribute();
	const pigment = mix( mix( color( 0x1b2a6b ), color( 0xff6a3d ), smoothstep( 0.05, 0.3, s ) ), color( 0xffe3a3 ), smoothstep( 0.3, 0.6, s ) );
	const fade = smoothstep( 0, 0.5, life.toAttribute() );

	scene.add( makePoints( COUNT, { position: vec3( position.toAttribute(), 0 ), color: pigment.mul( fade ), alpha: 0.3, size: 0.012 } ) );

	return {
		scene,
		update( delta, elapsed ) {

			uTime.value = elapsed;
			uDelta.value = Math.min( delta, 1 / 30 );
			renderer.compute( update );

		},
		dispose: () => disposeScene( scene )
	};

}
