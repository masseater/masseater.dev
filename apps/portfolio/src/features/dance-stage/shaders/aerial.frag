// note: 映像を地面に置いた一枚の板として扱い、上空から斜めに見下ろしながらゆっくり周りを回る。遠い側は霞ませ、板の外は草地にする。
void main() {
  float horizon = 0.18;
  vec3 sky = mix(vec3(0.62, 0.78, 0.95), vec3(0.85, 0.9, 0.95), uv.y / horizon);
  if (uv.y < horizon) {
    outColor = vec4(sky, 1.0);
    return;
  }
  float depth = 0.35 / (uv.y - horizon);
  vec2 ground = vec2((uv.x - 0.5) * depth * aspect(), 0.6 - depth);
  ground = rot(ground, time * 0.12);
  float h = 0.9 + 0.15 * sin(time * 0.3);
  vec2 p = ground / vec2(aspect(), 1.0) / h * 1.4 + vec2(0.5, 0.5);
  vec3 grass = mix(vec3(0.22, 0.38, 0.18), vec3(0.32, 0.5, 0.22), fbm(p * 12.0));
  vec3 c = mix(grass, rgb(p), inside(p));
  c = mix(c, sky, smoothstep(1.2, 4.0, depth));
  outColor = vec4(c, 1.0);
}
