// note: 両肩に細いワイヤーを付けて上から吊り、踊る人をゆっくり宙に持ち上げて揺らす。背景はその場に残り、人物だけが床から離れる。ワイヤーはあえて消さずに見せる。
void main() {
  float lift = (0.5 - 0.5 * cos(time * 0.9)) * 0.22;
  float sway = sin(time * 1.4) * 0.03;
  vec2 offset = vec2(sway, -lift);
  vec2 p = uv - offset;
  vec3 c = plate(uv);
  c = mix(c, c * 0.7, matte(p + vec2(0.0, -lift * 0.6 - 0.02)) * smoothstep(0.75, 0.95, uv.y) * 0.5);
  c = mix(c, rgb(p), matte(p));
  for (int i = 0; i < 2; i++) {
    vec2 hook = joint(i == 0 ? 11 : 12) + offset;
    vec2 top = vec2(hook.x + sway * 2.0, 0.0);
    c = mix(c, vec3(0.75), smoothstep(0.0012, 0.0004, segment(uv, top, hook)) * 0.8);
  }
  outColor = vec4(c, 1.0);
}
