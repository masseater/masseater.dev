// note: 3 秒ごとに顔へ一気に寄り、寄る途中は放射状にぶらす。寄ったあとは少し止めてから引く。
void main() {
  float phase = fract(time / 3.0);
  float zoom = smoothstep(0.0, 0.08, phase) * (1.0 - smoothstep(0.6, 0.75, phase));
  float speed = (smoothstep(0.0, 0.08, phase) - smoothstep(0.0, 0.08, phase - 0.02)) * 4.0;
  vec2 face = joint(0);
  float s = 1.0 + 2.5 * zoom;
  vec3 c = vec3(0);
  for (int i = 0; i < 12; i++) {
    float sc = s * (1.0 - speed * 0.02 * float(i));
    vec2 p = (uv - 0.5) / sc + mix(vec2(0.5), face, zoom);
    c += rgb(p);
  }
  outColor = vec4(c / 12.0, 1.0);
}
