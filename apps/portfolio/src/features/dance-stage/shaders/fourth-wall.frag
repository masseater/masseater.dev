// note: 4 秒ごとに、顔へ寄りながら画面のこちら側へ話しかける吹き出しを出す。見ている人を作品の外から内へ引き込む。
// text: ねえ、見てる？
void main() {
  float phase = fract(time / 4.0);
  float k = smoothstep(0.5, 0.65, phase) * (1.0 - smoothstep(0.92, 1.0, phase));
  vec2 p = (uv - 0.5) / (1.0 + 1.2 * k) + mix(vec2(0.5), joint(0) + vec2(0.0, 0.12), k);
  vec3 c = rgb(p);
  vec2 bubble = vec2(0.68, 0.22);
  float box = step(abs(uv.x - bubble.x), 0.26) * step(abs(uv.y - bubble.y), 0.08);
  c = mix(c, vec3(1.0), box * k);
  float t = textBox(uv, bubble, 0.08, 0);
  c = mix(c, vec3(0.1), t * k);
  outColor = vec4(c, 1.0);
}
