// note: 4 拍ごとに、胸に仕込んだ小さな火薬がはじけたように、火花と煙を出して体をびくっと揺らす。血糊の代わりに赤い絵の具が服に広がり、次の 4 拍で消えていく。
void main() {
  float cycle = floor(beatCount / 4.0);
  float since = mod(beatCount, 4.0) + beat;
  float kick = exp(-since * 6.0);
  vec2 chest = (joint(11) + joint(12)) * 0.5 + vec2(0.01, 0.04);
  vec2 p = uv + vec2(kick * 0.01, 0.0);
  vec3 c = rgb(p);
  float d = dist(uv, chest);
  float splat = smoothstep(0.04 + since * 0.01, 0.0, d + (noise(uv * 80.0 + cycle) - 0.5) * 0.03) * matte(uv) * (1.0 - smoothstep(2.0, 4.0, since));
  c = mix(c, vec3(0.75, 0.05, 0.08), splat * 0.85);
  float a = atan(uv.y - chest.y, (uv.x - chest.x) * aspect());
  float rays = step(0.85, hash(vec2(floor(a * 12.0), cycle))) * smoothstep(0.08 * (1.0 - kick) + 0.02, 0.0, abs(d - since * 0.25));
  c += vec3(1.0, 0.75, 0.3) * rays * kick * 2.0;
  float smoke = smoothstep(0.12, 0.0, d - since * 0.05) * fbm(uv * 20.0 - since) * smoothstep(1.5, 0.2, since);
  c = mix(c, vec3(0.8), smoke * 0.6);
  outColor = vec4(c, 1.0);
}
