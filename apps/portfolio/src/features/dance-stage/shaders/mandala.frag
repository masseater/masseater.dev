// note: 中心から 12 の向きに折り返した踊りの画と、同心円の輪の模様を重ね、全体をゆっくり回す。輪ごとに回る向きを変え、中心から対称に広がる模様にする。
void main() {
  vec2 q = (uv - 0.5) * vec2(aspect(), 1.0);
  float r = length(q);
  float ring = floor(r * 8.0);
  float a = atan(q.y, q.x) + time * 0.15 * (mod(ring, 2.0) * 2.0 - 1.0);
  float sector = PI / 6.0;
  a = mod(a, sector);
  a = min(a, sector - a);
  vec2 p = vec2(cos(a), sin(a)) * r;
  vec2 src = p / vec2(aspect(), 1.0) * 1.4 + bodyCenter() - vec2(0.05, 0.1);
  vec3 c = rgb(src);
  c = mix(c, hsv(vec3(ring * 0.08 + 0.05, 0.6, 0.9)), 0.35);
  float petal = smoothstep(0.02, 0.0, abs(fract(r * 8.0) - 0.5) - 0.45);
  c = mix(c, vec3(1.0, 0.9, 0.6), petal * 0.6);
  outColor = vec4(c, 1.0);
}
