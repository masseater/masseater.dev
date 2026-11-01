// note: 右手首のまわりだけを大きく膨らませて、手が画面から飛び出すような極端な遠近にする。手首には角ばった形の光を出す。
void main() {
  vec2 hand = joint(16);
  vec2 q = (uv - hand) * vec2(aspect(), 1.0);
  float r = length(q);
  float bulge = 1.0 / (1.0 + 2.5 * exp(-r * 6.0));
  vec2 p = hand + q * bulge / vec2(aspect(), 1.0);
  vec3 c = rgb(p);
  float a = atan(q.y, q.x) + time * 0.5;
  float spike = abs(fract(a / (2.0 * PI) * 5.0) - 0.5) * 2.0;
  float shape = step(r, 0.04 + 0.06 * (1.0 - spike) * (0.6 + 0.4 * exp(-beat * 4.0)));
  float inner = step(r, 0.02 + 0.03 * (1.0 - spike));
  c = mix(c, vec3(1.0, 0.95, 0.5), shape * 0.85);
  c = mix(c, vec3(1.0), inner);
  outColor = vec4(c, 1.0);
}
