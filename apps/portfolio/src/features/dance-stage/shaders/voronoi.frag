// note: 画面に散らした点と、踊る人の関節の点から、いちばん近い点ごとに画面を区切り、区画をその点の色 1 色で塗る。区画の境目は暗い線で縁取る。
void main() {
  vec2 q = uv * vec2(aspect(), 1.0);
  float best = 9.0;
  float second = 9.0;
  vec2 bestPoint = vec2(0.0);
  for (int i = 0; i < 48; i++) {
    float fi = float(i);
    vec2 p = vec2(hash(vec2(fi, 1.0)), hash(vec2(fi, 2.0))) + 0.02 * vec2(sin(time + fi), cos(time * 0.8 + fi));
    if (i < 33) p = mix(p, joint(i), step(0.5, jointVisible(i)));
    float d = length(q - p * vec2(aspect(), 1.0));
    if (d < best) { second = best; best = d; bestPoint = p; }
    else if (d < second) second = d;
  }
  vec3 c = rgb(bestPoint);
  c = mix(c, vec3(0.08), smoothstep(0.006, 0.002, second - best));
  outColor = vec4(c, 1.0);
}
