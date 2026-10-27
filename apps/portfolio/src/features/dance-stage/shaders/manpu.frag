// note: 頭のまわりに漫画の記号を描き足す。こめかみに大きな汗、反対側に怒りの青筋、拍のたびに頭の上に「！」を出す。
void main() {
  vec3 c = rgb(uv);
  vec2 head = joint(0);
  vec2 sweat = (uv - (head + vec2(0.06, -0.04))) * vec2(aspect(), 1.0);
  float drop = length(vec2(sweat.x, sweat.y * 0.75 + abs(sweat.x) * 0.7)) - 0.02;
  c = mix(c, vec3(0.6, 0.85, 1.0), smoothstep(0.002, 0.0, drop));
  c = mix(c, vec3(0.1, 0.3, 0.6), smoothstep(0.003, 0.0, abs(drop)));
  vec2 vein = abs((uv - (head + vec2(-0.06, -0.06))) * vec2(aspect(), 1.0));
  float cross_ = step(min(vein.x, vein.y), 0.004) * step(max(vein.x, vein.y), 0.025) * step(0.006, max(vein.x, vein.y));
  c = mix(c, vec3(0.9, 0.1, 0.15), cross_);
  float pop = exp(-beat * 5.0);
  vec2 ex = (uv - (head + vec2(0.0, -0.13))) * vec2(aspect(), 1.0) / (0.6 + pop * 0.6);
  float bar = step(abs(ex.x), 0.008) * step(-0.05, ex.y) * step(ex.y, 0.01);
  float dot_ = step(length(ex - vec2(0.0, 0.025)), 0.009);
  c = mix(c, vec3(0.95, 0.2, 0.2), max(bar, dot_) * step(0.05, pop));
  outColor = vec4(c, 1.0);
}
