// note: 拍のたびに踊る人が打たれたように後ろへはじかれ、0.3 秒で元の位置に戻る。はじかれた直後には反対側に白い集中線を出す。
void main() {
  float push = exp(-beat * 10.0) * 0.08;
  float dir = mod(beatCount, 2.0) * 2.0 - 1.0;
  vec2 p = uv - vec2(push * dir, 0.0);
  float m = matte(p);
  vec3 c = mix(plate(uv), rgb(p), m);
  vec2 hit = bodyCenter() + vec2(-dir * 0.12, -0.1);
  vec2 d = (uv - hit) * vec2(aspect(), 1.0);
  float a = atan(d.y, d.x);
  float lines = step(0.85, hash(vec2(floor(a * 30.0), floor(beatCount)))) * smoothstep(0.05, 0.15, length(d)) * smoothstep(0.35, 0.15, length(d));
  c = mix(c, vec3(1.0), lines * exp(-beat * 6.0));
  outColor = vec4(c, 1.0);
}
