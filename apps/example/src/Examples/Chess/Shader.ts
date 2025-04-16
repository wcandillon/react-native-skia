import { glsl } from "../../components/ShaderLib";

export const lib = glsl`
float sdRoundCone(vec3 a, vec3 b, float r1, float r2, vec3 p)
{
  vec3  ba = b - a;
  float l2 = dot(ba,ba);
  float rr = r1 - r2;
  float a2 = l2 - rr*rr;
  float il2 = 1.0/l2;

  vec3 pa = p - a;
  float y = dot(pa,ba);
  float z = y - l2;
  vec3 x =  pa*l2 - ba*y;
  float x2 = dot(x, x);
  float y2 = y*y*l2;
  float z2 = z*z*l2;

  float k = sign(rr)*rr*rr*x2;
  if( sign(z)*a2*z2 > k ) return  sqrt(x2 + z2)        *il2 - r2;
  if( sign(y)*a2*y2 < k ) return  sqrt(x2 + y2)        *il2 - r1;
                          return (sqrt(x2*a2*il2)+y*rr)*il2 - r1;
}

float sdCone(vec2 c, float h, vec3 p)
{
  float q = length(p.xz);
  return max(dot(c.xy,vec2(q,p.y)),-h-p.y);
}

float sdfCone( vec3 p, vec2 c, float h )
{
  // c is the sin/cos of the angle, h is height
  // Alternatively pass q instead of (c,h),
  // which is the point at the base in 2D
  vec2 q = h*vec2(c.x/c.y,-1.0);
    
  vec2 w = vec2( length(p.xz), p.y );
  vec2 a = w - q*clamp( dot(w,q)/dot(q,q), 0.0, 1.0 );
  vec2 b = w - q*vec2( clamp( w.x/q.x, 0.0, 1.0 ), 1.0 );
  float k = sign( q.y );
  float d = min(dot( a, a ),dot(b, b));
  float s = max( k*(w.x*q.y-w.y*q.x),k*(w.y-q.y)  );
  return sqrt(d)*sign(s);
}

float sdEllipsoid(vec3 r, vec3 p)
{
  float k0 = length(p/r);
  float k1 = length(p/(r*r));
  return k0*(k0-1.0)/k1;
}

float sdCappedCylinder(float h, float r, vec3 p)
{
  vec2 d = abs(vec2(length(p.xz),p.y)) - vec2(r,h);
  return min(max(d.x,d.y),0.0) + length(max(d,0.0));
}

float sdSphere(vec3 o, float r, vec3 p)
{
  return length(p - o) - r;
}

float sdRoundCone( vec3 p, vec3 b, float r )
{
  vec3 q = abs(p) - b + r;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0) - r;
}

float dot2( in vec3 v ) { return dot(v,v); }

float sdTorus(vec2 t, vec3 p)
{
  vec2 q = vec2(length(p.xz)-t.x,p.y);
  return length(q)-t.y;
}

float sdCappedTorus( vec3 p, vec2 sc, float ra, float rb)
{
  p.x = abs(p.x);
  float k = (sc.y*p.x>sc.x*p.y) ? dot(p.xy,sc) : length(p.xy);
  return sqrt( dot(p,p) + ra*ra - 2.0*ra*k ) - rb;
}

float sdHPlane(float h, vec3 p)
{
  return p.y - h;
}

float smin(float a, float b, float k)
{
  float h = max( k-abs(a-b), 0.0 )/k;
  return min( a, b ) - h*h*k*(1.0/4.0);
}

float smax(float a, float b, float k)
{
  k *= 1.4;
  float h = max(k-abs(a-b),0.0);
  return max(a, b) + h*h*h/(6.0*k*k);
}

// Queen SDF is based on https://www.shadertoy.com/view/3sVfW3
float sdQueen( vec3 p ) {
  p += vec3(0., -1.4, 0.);
  // cylinder body
  vec3 p0 = p - vec3(0., 0.5, 0.);
  float r = (1./6.)*pow(p0.y, 2.) - (4./30.)*p0.y + 0.3067;
  float d0 = sdCappedCylinder(1.5, r, p0) - 0.02;
  // hole in the top of the cylinder
  vec3 p1 = p - vec3(0., 1.9, 0.);
  float d1 = sdCappedCylinder(0.2, r - 0.1, p1);
  d0 = smax(d0, -d1, 0.03);
  // crown
  {
    // Transform point for crown spikes with 8-fold radial symmetry
    vec3 p2 = p - vec3(0., 2.05, 0.);  // Move reference point to crown height
    // Convert x,z coordinates to polar angle (theta)
    float theta = atan(p2.z, p2.x);
    // Add PI/8 offset, wrap to PI/4 segments (8 segments total), then remove offset
    // This creates 8 identical segments around the circle
    float repeatedAngle = mod(theta + PI/8., PI/4.) - PI/8.;
    // Get radius in xz-plane
    float radius = length(vec2(p2.x, p2.z));
    // Convert back to cartesian coordinates, but using the repeated angle
    // y remains unchanged, but x,z are replaced with the new angle-adjusted coordinates
    p2 = vec3(p2.y, radius * cos(repeatedAngle), radius * sin(repeatedAngle)); 
    // Create cylinder for each spike
    float d2 = sdCappedCylinder(0.6, 0.12, p2);
    d0 = smax(d0, -d2, 0.07);
  }
  // head cone
  vec3 p3 = p - vec3(0., 2.15, 0.);
  float d3 = sdfCone(p3, vec2(0.001), 0.31);
  d0 = smin(d0, d3, 0.045);
  // head sphere
  float d4 = sdSphere(vec3(0., 2.18, 0.), 0.09, p);
  d0 = smin(d0, d4, 0.03);
  // ring 1
  vec3 p5 = p - vec3(0., 1.4, 0.);
  vec3 radii = vec3(0.5, 0.07, 0.5);
  float d5 = sdEllipsoid(radii, p5);
  d0 = smin(d0, d5, 0.03);
  // ring 2
  vec3 p6 = p - vec3(0., 1.51, 0.);
  float d6 = sdEllipsoid(vec3(0.42, 0.07, 0.42), p6);
  d0 = smin(d0, d6, 0.03);
  // base torus
  vec3 p7 = p - vec3(0., -1., 0.);
  float d7 = sdTorus(vec2(0.43, 0.5), p7);
  d0 = smin(d0, d7, 0.03);
  // inner base ring 1
  float d9 = sdTorus(vec2(0.586, 0.01), p - vec3(0., -0.425, 0.));
  d0 = smax(d0, -d9, 0.05);
  // inner base ring 2
  float d10 = sdTorus(vec2(0.553, 0.01), p - vec3(0., -0.345, 0.));
  d0 = smax(d0, -d10, 0.05);
  return d0;
}
`;
