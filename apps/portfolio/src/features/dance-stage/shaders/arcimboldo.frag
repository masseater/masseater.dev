// note: 人物の形を、色とりどりの果物の粒を寄せ集めて埋める。一粒ずつは丸い果物に見え、全体としては踊る人の形に見える。
void main() {
  vec2 q = uv * vec2(aspect(), 1.0) * 26.0;
  vec3 c = vec3(0.12, 0.08, 0.05);
  for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) {
    vec2 cell = floor(q) + vec2(float(i), float(j));
    vec2 at = cell + 0.5 + 0.35 * (vec2(hash(cell), hash(cell + 1.7)) - 0.5);
    vec2 home = at / 26.0 / vec2(aspect(), 1.0);
    if (matte(home) < 0.5) continue;
    float r = 0.55 + 0.2 * hash(cell + 4.2);
    float d = length(q - at) / r;
    if (d > 1.0) continue;
    float kind = floor(hash(cell + 8.8) * 5.0);
    vec3 fruit = kind < 1.0 ? vec3(0.8, 0.12, 0.1) : kind < 2.0 ? vec3(0.95, 0.55, 0.1) : kind < 3.0 ? vec3(0.4, 0.62, 0.15) : kind < 4.0 ? vec3(0.95, 0.85, 0.25) : vec3(0.45, 0.15, 0.4);
    fruit = mix(fruit, rgb(home), 0.25);
    vec2 n = (q - at) / r;
    float light = 0.55 + 0.45 * dot(normalize(vec3(n, sqrt(max(0.0, 1.0 - dot(n, n))))), normalize(vec3(-0.4, -0.5, 0.75)));
    float spec = pow(max(0.0, 1.0 - length(n - vec2(-0.35, -0.4)) * 3.0), 3.0);
    c = fruit * light + spec * 0.6;
  }
  outColor = vec4(c, 1.0);
}
