// Node smoke test: builds every scene's node graph (no GPU) to catch JS/TSL construction errors.
// usage: node scripts/smoke.mjs [themeFile ...]   e.g. node scripts/smoke.mjs ocean cosmos
import { THEMES } from '../src/scenes/index.js';

const only = process.argv.slice( 2 );
const files = [ 'machine', 'atmosphere', 'ocean', 'life', 'earth', 'cosmos', 'micro', 'city', 'countryside', 'physics' ];
const fakeRenderer = { compute() {} };

// A JS number mixed with a node (e.g. `1.2 - node.mul( x )`) silently becomes a NaN constant,
// which blacks out the whole frame through bloom. Walk the node graph and flag NaN constants.
function findNaN( root ) {

	const seen = new Set(), stack = [ root ];
	while ( stack.length ) {

		const o = stack.pop();
		if ( ! o || typeof o !== 'object' || seen.has( o ) ) continue;
		seen.add( o );
		if ( o.isNode && typeof o.value === 'number' && Number.isNaN( o.value ) ) return true;
		for ( const v of Object.values( o ) ) if ( v && typeof v === 'object' && ( v.isNode || Array.isArray( v ) ) ) stack.push( v );

	}

	return false;

}
let fail = 0, n = 0;

THEMES.forEach( ( theme, ti ) => {

	if ( only.length && ! only.includes( files[ ti ] ) ) return;
	theme.scenes.forEach( ( scene, k ) => {

		n ++;
		const id = `${ ti * 10 + k + 1 } ${ scene.meta?.title?.en }`;
		try {

			if ( ! scene.meta?.title?.ko || ! scene.meta?.ref?.en || ! scene.cameraPosition ) throw new Error( 'missing meta/cameraPosition' );
			const s = scene.create( fakeRenderer );
			s.scene.traverse( ( o ) => {

				for ( const key of [ 'positionNode', 'colorNode', 'scaleNode' ] ) if ( o.material?.[ key ] && findNaN( o.material[ key ] ) ) throw new Error( `NaN constant in ${ key }` );

			} );
			s.update( 0.016, 1.5 );
			s.dispose();

		} catch ( e ) {

			fail ++;
			console.log( `FAIL ${ id }: ${ e.message }` );

		}

	} );
	console.log( `${ files[ ti ] }: ${ theme.scenes.length } scenes` );

} );

console.log( `${ n - fail }/${ n } ok` );
process.exit( fail ? 1 : 0 );
