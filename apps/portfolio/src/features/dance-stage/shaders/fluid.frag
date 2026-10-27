// note: 煙の濃さを毎コマ、渦を巻く流れに沿って運び直し、両手首から色の付いた煙を足し続ける。煙はゆっくり薄れ、手の動きに引かれて流れる。
// pass: dye persistent
uniform sampler2D dye;
vec2 flowAt(vec2 p) {
  float e = 0.01;
  float n = fbm(p * 3.0 + time * 0.1);
  float nx = fbm((p + vec2(e, 0.0)) * 3.0 + time * 0.1);
  float ny = fbm((p + vec2(0.0, e)) * 3.0 + time * 0.1);
  return vec2(ny - n, -(nx - n)) / e * 0.002 + vec2(0.0, -0.0015);
}
void main() {
  vec2 back = uv - flowAt(uv);
  vec3 last = read(dye, back).rgb * 0.992;
  for (int i = 0; i < 2; i++) {
    float d = segment(uv, lastJoint(i == 0 ? 15 : 16), joint(i == 0 ? 15 : 16));
    vec3 col = i == 0 ? vec3(0.2, 0.6, 1.0) : vec3(1.0, 0.35, 0.6);
    last = max(last, col * smoothstep(0.03, 0.0, d));
  }
  outColor = vec4(last, 1.0);
}
// pass:
uniform sampler2D dye;
void main() {
  vec3 c = rgb(uv) * 0.3 + read(dye, uv).rgb;
  outColor = vec4(c, 1.0);
}
