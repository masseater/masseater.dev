// note: 踊る人の手元を大きく寄せて柔らかい光で照らし、画面の下に音の波形を大きく描いて、拍のたびに擬音の字を小さく出す。音を目で聞かせる構成にする。
// text: サクッ
void main() {
  vec2 p = mix(joint(16), bodyCenter(), 0.35) + (uv - 0.5) * 0.45;
  vec3 c = blurRgb(p, 0.002) * vec3(1.05, 1.0, 0.92) * 1.05;
  c *= 1.0 - 0.4 * length((uv - 0.5) * vec2(1.0, 1.2));
  float x = uv.x;
  float amp = 0.0;
  for (int i = 0; i < 8; i++) amp += sin(x * (20.0 + float(i) * 13.0) + time * (5.0 + float(i))) * bands[i] * 0.04;
  float wave = abs(uv.y - 0.85 - amp);
  c = mix(c, vec3(1.0), smoothstep(0.004, 0.0, wave) * 0.9);
  c = mix(c, vec3(1.0), textBox(uv, vec2(0.75, 0.2 - beat * 0.05), 0.08, 0) * exp(-beat * 3.0));
  outColor = vec4(c, 1.0);
}
