// note: 踊る人と、その人を 180 度回した姿を重ね、上下どちら向きに見ても同じ形になる絵にする。4 秒ごとに画面ごとゆっくり半回転させても、回りきると元と同じに見える。
void main() {
  float turn = smoothstep(0.6, 1.0, fract(time / 4.0)) * PI;
  vec2 p = rot((uv - 0.5) * vec2(aspect(), 1.0), turn) / vec2(aspect(), 1.0) + 0.5;
  float a = matte(p);
  float b = matte(1.0 - p);
  vec3 c = vec3(0.96, 0.94, 0.9);
  c = mix(c, vec3(0.85, 0.2, 0.3), a);
  c = mix(c, vec3(0.15, 0.3, 0.75), b * (1.0 - a));
  c = mix(c, vec3(0.35, 0.1, 0.4), a * b);
  outColor = vec4(c, 1.0);
}
