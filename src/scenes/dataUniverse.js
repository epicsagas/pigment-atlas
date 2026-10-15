// P2 Data Universe: an "archive" shelved in accession order morphs into its embedding,
// where items gather by similarity. Study of Archive Dreaming / Unsupervised: Data Universe.
import * as THREE from 'three/webgpu';
import { instancedArray, uniform, vec4, mix, smoothstep, clamp, length, uv } from 'three/tsl';
import { curl } from '../tsl/curl.js';

export const meta = {
	title: { ko: '데이터 유니버스', en: 'Data Universe' },
	ref: { ko: 'Archive Dreaming, Unsupervised: Data Universe: 소장 순서로 꽂힌 아카이브가 유사도 성운으로 재배열', en: 'Archive Dreaming, Unsupervised: Data Universe: an archive shelved by accession regroups into a similarity nebula' }
};
export const cameraPosition = [ 0, 0.6, 6.5 ];

const COUNT = 200_000;
const CLUSTERS = 12;

// Synthetic stand-in for UMAP output (plan P5 swaps in real coordinates).
function makeArchive() {

	const grid = new Float32Array( COUNT * 3 );
	const embed = new Float32Array( COUNT * 3 );
	const tint = new Float32Array( COUNT * 3 );
	const delay = new Float32Array( COUNT );

	const centers = Array.from( { length: CLUSTERS }, () => new THREE.Vector3().randomDirection().multiplyScalar( 0.6 + Math.random() * 1.6 ) );
	const colors = centers.map( ( _, i ) => new THREE.Color().setHSL( ( 0.5 + i / CLUSTERS * 0.6 ) % 1, 0.8, 0.55 ) );
	const gauss = () => Math.sqrt( - 2 * Math.log( 1 - Math.random() ) ) * Math.cos( 2 * Math.PI * Math.random() );

	const [ cols, rows ] = [ 100, 50 ];
	const layers = Math.ceil( COUNT / ( cols * rows ) );
	const p = new THREE.Vector3();

	for ( let i = 0; i < COUNT; i ++ ) {

		const c = Math.floor( Math.random() * CLUSTERS );

		// Shelves: accession order, colors mixed.
		const x = i % cols, y = Math.floor( i / cols ) % rows, z = Math.floor( i / ( cols * rows ) );
		grid.set( [ ( x / ( cols - 1 ) - 0.5 ) * 4.8, ( y / ( rows - 1 ) - 0.5 ) * 2.4, ( z / Math.max( layers - 1, 1 ) - 0.5 ) * 1.6 ], i * 3 );

		// Embedding: gaussian blob, or a filament toward a neighbouring cluster (UMAP-like bridges).
		if ( Math.random() < 0.82 ) {

			p.set( gauss(), gauss() * 0.6, gauss() ).multiplyScalar( 0.22 ).add( centers[ c ] );

		} else {

			p.lerpVectors( centers[ c ], centers[ ( c + 1 ) % CLUSTERS ], Math.random() );
			p.x += gauss() * 0.04; p.y += gauss() * 0.04; p.z += gauss() * 0.04;

		}

		embed.set( [ p.x, p.y, p.z ], i * 3 );
		tint.set( [ colors[ c ].r, colors[ c ].g, colors[ c ].b ], i * 3 );
		delay[ i ] = p.length() / 2.5;

	}

	return { grid, embed, tint, delay };

}

export function create() {

	const scene = new THREE.Scene();
	const data = makeArchive();

	const grid = instancedArray( data.grid, 'vec3' ).toAttribute();
	const embed = instancedArray( data.embed, 'vec3' ).toAttribute();
	const tint = instancedArray( data.tint, 'vec3' ).toAttribute();
	const delay = instancedArray( data.delay, 'float' ).toAttribute();

	const uMorph = uniform( 0 );
	const uTime = uniform( 0 );

	// Wave of reorganisation sweeps outward from the centre.
	const m = smoothstep( 0, 1, clamp( uMorph.mul( 1.6 ).sub( delay.mul( 0.6 ) ), 0, 1 ) );
	const drift = curl( embed.mul( 0.9 ).add( uTime.mul( 0.05 ) ) ).mul( 0.03 ).mul( m );

	const material = new THREE.SpriteNodeMaterial( { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending } );
	material.positionNode = mix( grid, embed, m ).add( drift );
	material.colorNode = vec4( mix( tint.mul( 0.35 ), tint, m ), smoothstep( 0.5, 0.1, length( uv().sub( 0.5 ) ) ).mul( 0.3 ) );
	material.scaleNode = uniform( 0.012 );

	const points = new THREE.Sprite( material );
	points.count = COUNT;
	points.frustumCulled = false;
	scene.add( points );

	return {
		scene,
		update( delta, elapsed ) {

			uTime.value = elapsed;
			// 20 s cycle with holds at both ends.
			const tri = 1 - Math.abs( ( elapsed / 10 ) % 2 - 1 );
			uMorph.value = THREE.MathUtils.smoothstep( tri, 0.15, 0.85 );
			points.rotation.y = elapsed * 0.04;

		},
		dispose() {

			material.dispose();

		}
	};

}
