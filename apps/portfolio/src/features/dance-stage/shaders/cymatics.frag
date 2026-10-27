// note: 振動する板に砂をまいたときのように、節の線に沿って白い模様を浮かび上がらせる。拍ごとに振動の型が変わり、踊る人は板の下から薄く透ける。
void main() {
  vec2 p = (uv - 0.5) * vec2(aspect(), 1.0) * 1.1;
  float k = mod(beatCount, 6.0);
  float n = 2.0 + k;
  float m = 3.0 + mod(k * 2.0, 5.0);
  float a = cos(n * PI * p.x) * cos(m * PI * p.y) - cos(m * PI * p.x) * cos(n * PI * p.y);
  float grain = hash(floor(uv * resolution / 2.0) + floor(time * 3.0));
  float sand = smoothstep(0.12 + 0.05 * level, 0.0, abs(a)) * step(0.35, grain);
  vec3 plateColor = vec3(0.08, 0.08, 0.1) + rgb(uv) * 0.18 * (0.5 + matte(uv));
  vec3 c = mix(plateColor, vec3(0.95, 0.92, 0.85), sand);
  outColor = vec4(c, 1.0);
}
