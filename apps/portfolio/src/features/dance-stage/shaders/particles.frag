// note: 踊る人の体から細かい粒が離れ、上へ流されながら消えていく。粒は 2 秒かけて昇り、生まれた瞬間の体の色を持ち続ける。
vec2 velocity(float age, float seed) {
  return vec2(sin(seed * 6.28 + age * 2.0) * 0.03, -0.18) * age;
}
void main() {
  vec3 c = rgb(uv) * 0.35;
  c = mix(c, rgb(uv), matte(uv) * 0.6);
  float grid = 90.0;
  for (int k = 0; k < 10; k++) {
    float age = (float(k) + fract(time * 5.0)) / 5.0;
    vec2 cellSeed = floor((uv - velocity(age, 0.5)) * vec2(grid * aspect(), grid));
    float seed = hash(cellSeed + float(k));
    vec2 origin = (cellSeed + 0.5) / vec2(grid * aspect(), grid);
    vec2 pos = origin + velocity(age, seed);
    float born = time - age;
    if (pastMatte(origin, born) < 0.5 || seed > 0.5) continue;
    float d = dist(uv, pos);
    float size = 0.004 * (1.0 - age * 0.4);
    c = mix(c, pastRgb(origin, born) * 1.2, smoothstep(size, size * 0.4, d) * (1.0 - age / 2.0));
  }
  outColor = vec4(c, 1.0);
}
