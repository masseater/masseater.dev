// note: 4 秒ごとに大きな手のひらがレンズの前を横切って画面をふさぎ、手が離れると背景が夕方の海辺に、服の色が別の色に変わっている。次の 4 秒で元に戻る。
void main() {
  float cycle = floor(time / 4.0);
  float t = mod(time, 4.0);
  float pass_ = smoothstep(3.3, 3.95, t);
  float handX = mix(-0.6, 1.6, pass_);
  float alt = mod(cycle, 2.0);
  vec3 base = rgb(uv);
  float m = matte(uv);
  vec3 sky = mix(vec3(1.0, 0.65, 0.4), vec3(0.3, 0.4, 0.8), 1.0 - uv.y * 1.3);
  vec3 beach = mix(sky, vec3(0.2, 0.4, 0.6), step(0.6, uv.y));
  beach = mix(beach, vec3(0.9, 0.8, 0.6), step(0.8, uv.y));
  vec3 outfit = mix(base, hsv(vec3(0.95, 0.5, luma(base) * 1.4)), step(0.15, luma(base)) * 0.7);
  vec3 alternate = mix(beach, outfit, m);
  vec3 c = mix(base, alternate, alt);
  vec2 hp = (uv - vec2(handX, 0.5)) * vec2(aspect(), 1.0);
  float palm = step(length(hp / vec2(0.7, 0.9)), 1.0);
  for (int i = 0; i < 4; i++) {
    vec2 f = hp - vec2(-0.45 + float(i) * 0.3, -0.75);
    palm = max(palm, step(length(f / vec2(0.12, 0.4)), 1.0));
  }
  vec3 skin = vec3(0.85, 0.65, 0.5) * (0.6 + 0.4 * smoothstep(1.0, 0.0, length(hp)));
  c = mix(c, skin * 0.6, palm * step(0.01, pass_) * step(pass_, 0.99));
  outColor = vec4(c, 1.0);
}
