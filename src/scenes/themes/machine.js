// Theme 1: Machine Dreams — Anadol's data and AI grammar.
import { Fn, If, Loop, vec3, sin, cos, mix, fract, smoothstep, exp, color } from 'three/tsl';
import { defineScene, gradient, TAU, rand } from '../../lib/defineScene.js';
import * as dataPigment from '../dataPigment.js';
import * as dataUniverse from '../dataUniverse.js';
import * as latentWalk from '../latentWalk.js';
import * as infinityRoom from '../infinityRoom.js';
import * as dataTunnel from '../dataTunnel.js';
import * as meltingMemories from '../meltingMemories.js';
import * as quantumMemories from '../quantumMemories.js';

const LAYERS = [ 16, 36, 64, 64, 36, 10 ];
const node = ( l, j ) => {

	const n = LAYERS[ l ], side = Math.ceil( Math.sqrt( n ) );
	return [ ( l / ( LAYERS.length - 1 ) - 0.5 ) * 5, ( ( j % side ) / Math.max( side - 1, 1 ) - 0.5 ) * 2.2, ( Math.floor( j / side ) / Math.max( side - 1, 1 ) - 0.5 ) * 2.2 ];

};

const neuralNetwork = defineScene( {
	meta: {
		title: { ko: '신경망', en: 'Neural Network' },
		ref: { ko: '층별 노드와 연결을 따라 활성 신호가 입력에서 출력으로 흐른다', en: 'Activations travel layer by layer along weighted connections, input to output' }
	},
	camera: [ 0.8, 0.8, 5.2 ],
	count: 140_000,
	init() {

		const l = Math.floor( rand( 0, LAYERS.length - 1 ) );
		const a = node( l, Math.floor( rand( 0, LAYERS[ l ] ) ) ), b = node( l + 1, Math.floor( rand( 0, LAYERS[ l + 1 ] ) ) );
		return [ ...a, ...b, Math.random() ];

	},
	position: ( { a, b, t } ) => mix( a, b.xyz, fract( t.mul( 0.35 ).add( b.w ) ) ),
	color: ( { a, b, t } ) => {

		// A pulse front sweeps across the layers every 4 s.
		const front = fract( t.mul( 0.25 ) ).mul( 7 ).sub( 1 );
		const x = a.x.div( 5 ).add( 0.5 ).mul( 5 );
		const d = x.sub( front );
		const flash = exp( d.mul( d ).mul( - 4 ) );
		return gradient( a.x.div( 5 ).add( 0.5 ), [ 0x2b3cff, 0x19c6d8, 0xff4fa3 ] ).mul( flash.mul( 1.6 ).add( 0.15 ) );

	},
	alpha: 0.3,
	size: 0.01,
	spin: 0.05
} );

// Synthetic multi-head attention over 64 tokens: local heads plus a few long-range heads.
const TOKENS = 64;
const pairs = [];
for ( let q = 0; q < TOKENS; q ++ ) for ( let k = 0; k < TOKENS; k ++ ) {

	const d = Math.min( Math.abs( q - k ), TOKENS - Math.abs( q - k ) );
	const head = d <= 3 ? 0 : ( ( q * 7 + k * 3 ) % 23 === 0 ? 1 : - 1 );
	if ( head >= 0 && q !== k ) pairs.push( [ q, k, head, head === 0 ? 1 - d / 4 : 0.9 ] );

}

const attentionMap = defineScene( {
	meta: {
		title: { ko: '어텐션 지도', en: 'Attention Map' },
		ref: { ko: '원형으로 놓인 토큰 사이를 어텐션 가중치만큼 높은 아치가 잇는다', en: 'Tokens on a ring, linked by arches as tall as their attention weights' }
	},
	camera: [ 0, 2.6, 4.4 ],
	count: 120_000,
	init() {

		const [ q, k, head, w ] = pairs[ Math.floor( Math.random() * pairs.length ) ];
		return [ q / TOKENS * TAU, k / TOKENS * TAU, w * ( head ? 1.6 : 0.5 ), Math.random(), w, head ];

	},
	position: ( { a, b, t } ) => {

		const R = 1.8;
		const p0 = vec3( cos( a.x ), 0, sin( a.x ) ).mul( R ), p1 = vec3( cos( a.y ), 0, sin( a.y ) ).mul( R );
		const c = p0.add( p1 ).mul( 0.5 ).add( vec3( 0, a.z, 0 ) );
		const s = fract( t.mul( 0.15 ).add( b.x ) );
		const r = s.oneMinus();
		return p0.mul( r.mul( r ) ).add( c.mul( r.mul( s ).mul( 2 ) ) ).add( p1.mul( s.mul( s ) ) );

	},
	color: ( { b } ) => mix( color( 0x19c6d8 ), color( 0xffb547 ), b.z ).mul( b.y.mul( 0.8 ).add( 0.2 ) ),
	alpha: 0.35,
	size: 0.01,
	spin: 0.04
} );

// Loss landscape: a bowl with four gaussian wells; walkers follow the gradient flow into their basin.
const WELLS = [ [ - 1.2, - 0.8, 0.9 ], [ 1.1, - 1, 0.7 ], [ 0.9, 1.1, 1.1 ], [ - 1, 1, 0.6 ] ];
const lossTSL = ( x, z ) => WELLS.reduce(
	( s, [ wx, wz, d ] ) => {

		const dx = x.sub( wx ), dz = z.sub( wz );
		return s.sub( exp( dx.mul( dx ).add( dz.mul( dz ) ).div( - 0.5 ) ).mul( d ) );

	},
	x.mul( x ).add( z.mul( z ) ).mul( 0.06 )
);

// dL/dx of the bowl is 0.12 x; of each well -d exp(-r^2 / 0.5) it is 4 d (x - wx) exp(-r^2 / 0.5).
const DESCENT_STEPS = 48, DESCENT_TIME = 12; // Euler step <= 0.25 stays stable for the wells' curvature (~3.6)

const gradientDescent = defineScene( {
	meta: {
		title: { ko: '경사 하강', en: 'Gradient Descent' },
		ref: { ko: '손실 지형 위 탐색점들이 기울기를 따라 가장 가까운 골짜기로 굴러간다', en: 'Walkers on a loss landscape roll downhill into the nearest valley' }
	},
	camera: [ 0, 3.6, 5.6 ],
	count: 150_000,
	init( i, n ) {

		if ( i < n * 0.8 ) return [ rand( - 2.6, 2.6 ), 0, rand( - 2.6, 2.6 ), 0, 0, 0, 0 ]; // terrain
		return [ rand( - 2.4, 2.4 ), 0, rand( - 2.4, 2.4 ), 0, 0, Math.random(), 1 ];

	},
	position: ( { a, b, t } ) => Fn( () => {

		const x = a.x.toVar(), z = a.z.toVar();

		// Walkers integrate the gradient flow dp/dt = -grad L from their start, so every step goes downhill.
		If( b.w.greaterThan( 0.5 ), () => {

			const h = fract( t.mul( 0.08 ).add( b.z ) ).mul( DESCENT_TIME / DESCENT_STEPS );
			Loop( DESCENT_STEPS, () => {

				const gx = x.mul( 0.12 ).toVar(), gz = z.mul( 0.12 ).toVar();
				for ( const [ wx, wz, d ] of WELLS ) {

					const dx = x.sub( wx ), dz = z.sub( wz );
					const e = exp( dx.mul( dx ).add( dz.mul( dz ) ).div( - 0.5 ) ).mul( 4 * d );
					gx.addAssign( e.mul( dx ) );
					gz.addAssign( e.mul( dz ) );

				}

				x.subAssign( gx.mul( h ) );
				z.subAssign( gz.mul( h ) );

			} );

		} );

		return vec3( x, lossTSL( x, z ).mul( 1.2 ).add( b.w.mul( 0.04 ) ), z );

	} )(),
	color: ( { a, b } ) => {

		const height = smoothstep( - 1, 0.6, lossTSL( a.x, a.z ) );
		return mix( gradient( height, [ 0x1b0f4a, 0x2f7bff, 0x9fe8ff ] ).mul( 0.5 ), color( 0xffd27a ).mul( 1.6 ), b.w );

	},
	alpha: 0.3,
	size: 0.011,
	spin: 0.03
} );

export default [ dataPigment, dataUniverse, latentWalk, infinityRoom, dataTunnel, meltingMemories, quantumMemories, neuralNetwork, attentionMap, gradientDescent ];
