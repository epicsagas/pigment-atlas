import { Fn, vec3, mx_noise_vec3 } from 'three/tsl';

const E = 0.08;

// Divergence-free flow: curl of a 3D Perlin potential field, central differences.
export const curl = Fn( ( [ p ] ) => {

	const dx = vec3( E, 0, 0 ), dy = vec3( 0, E, 0 ), dz = vec3( 0, 0, E );

	const x0 = mx_noise_vec3( p.sub( dx ) ), x1 = mx_noise_vec3( p.add( dx ) );
	const y0 = mx_noise_vec3( p.sub( dy ) ), y1 = mx_noise_vec3( p.add( dy ) );
	const z0 = mx_noise_vec3( p.sub( dz ) ), z1 = mx_noise_vec3( p.add( dz ) );

	return vec3(
		y1.z.sub( y0.z ).sub( z1.y.sub( z0.y ) ),
		z1.x.sub( z0.x ).sub( x1.z.sub( x0.z ) ),
		x1.y.sub( x0.y ).sub( y1.x.sub( y0.x ) )
	).div( 2 * E );

} );
